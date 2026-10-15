from decimal import Decimal


def test_health(client):
    assert client.get("/api/health").json()["postgres"] is True


def test_lists_are_paginated_and_capped(client):
    r = client.get("/api/orders?page=1&limit=5")
    assert r.status_code == 200
    body = r.json()
    assert len(body["items"]) <= 5 and body["total"] >= len(body["items"])
    assert client.get("/api/orders?limit=100000").status_code == 400  # never dump the whole table
    assert client.get("/api/orders?status=BOGUS").status_code == 400


def test_audit_trail_shows_running_balance_and_topup_credit(client, make_user, restaurant_id):
    uid = make_user(200)
    client.post("/api/checkout", json={"user_id": uid, "restaurant_id": restaurant_id, "amount": "50"})
    top = client.post(f"/api/users/{uid}/topup", json={"amount": "25"})
    assert top.status_code == 200 and top.json()["audit_entry"]["action_type"] == "CREDIT"
    a = client.get(f"/api/users/{uid}/audit").json()
    assert a["total"] == 2
    assert [x["action_type"] for x in a["items"]] == ["CREDIT", "DEBIT"]  # newest first
    assert Decimal(str(a["items"][0]["running_balance"])) == Decimal("175")
    assert Decimal(str(a["items"][1]["running_balance"])) == Decimal("150")
    assert client.get(f"/api/users/{uid}/audit?from=2999-01-01").json()["total"] == 0  # date filter


def test_map_requires_a_point(client):
    assert client.get("/api/drivers/nearby").status_code == 400
    assert client.get("/api/drivers/nearby?lat=999&lng=0").status_code == 400
