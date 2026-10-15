"""Workflow 1 through the API: success, insufficient balance, active-order conflict."""
from decimal import Decimal


def post_checkout(client, user_id, restaurant_id, amount):
    return client.post("/api/checkout", json={"user_id": user_id, "restaurant_id": restaurant_id, "amount": amount})


def test_checkout_success_debits_wallet_and_writes_audit_row(client, make_user, restaurant_id):
    uid = make_user(500)
    r = post_checkout(client, uid, restaurant_id, "120.00")
    assert r.status_code == 200, r.text
    body = r.json()
    assert Decimal(str(body["balance_before"])) == Decimal("500")
    assert Decimal(str(body["balance_after"])) == Decimal("380")
    assert body["order"]["status"] == "PREPARING"
    assert Decimal(str(body["order"]["total_amount"])) == Decimal("120")
    audit = body["audit_entry"]  # proves the trigger fired
    assert audit["action_type"] == "DEBIT"
    assert Decimal(str(audit["amount_changed"])) == Decimal("120")
    assert Decimal(str(audit["balance_after"])) == Decimal("380")


def test_insufficient_balance_is_rejected_and_nothing_changes(client, make_user, restaurant_id):
    uid = make_user(10)
    r = post_checkout(client, uid, restaurant_id, "50.00")
    assert r.status_code == 409
    assert r.json()["error_code"] == "INSUFFICIENT_BALANCE"
    user = client.get(f"/api/users/{uid}").json()
    assert Decimal(str(user["wallet_balance"])) == Decimal("10")  # rolled back
    assert user["recent_orders"] == []


def test_second_active_order_is_blocked_until_first_is_delivered(client, make_user, restaurant_id):
    uid = make_user(1000)
    first = post_checkout(client, uid, restaurant_id, "100")
    assert first.status_code == 200
    second = post_checkout(client, uid, restaurant_id, "100")
    assert second.status_code == 409
    assert second.json()["error_code"] == "ACTIVE_ORDER_EXISTS"
    # failed attempt must not have taken money
    assert Decimal(str(client.get(f"/api/users/{uid}").json()["wallet_balance"])) == Decimal("900")

    order_id = first.json()["order"]["id"]
    assert client.post(f"/api/orders/{order_id}/advance").json()["status"] == "DELIVERING"
    assert client.post(f"/api/orders/{order_id}/advance").json()["status"] == "DELIVERED"
    assert client.post(f"/api/orders/{order_id}/advance").status_code == 409  # nothing after DELIVERED
    assert post_checkout(client, uid, restaurant_id, "100").status_code == 200


def test_invalid_input_gets_friendly_errors(client, make_user, restaurant_id):
    uid = make_user(100)
    assert post_checkout(client, uid, restaurant_id, "0").status_code == 400
    assert post_checkout(client, "00000000-0000-0000-0000-000000000000", restaurant_id, "5").status_code == 404
    assert post_checkout(client, "not-a-uuid", restaurant_id, "5").json()["error_code"] == "VALIDATION_ERROR"
