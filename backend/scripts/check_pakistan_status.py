"""Read-only sanity check: what's the actual Pakistan/Kyrgyzstan state in Atlas?

Run via Render Shell:
    cd scripts && python3 check_pakistan_status.py

No writes — only reports. Use this to decide whether to run
replace_kyrgyzstan_pakistan.py (full migration) or not.
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient


async def check():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "wandermark")]

    pk_country = await db.countries.find_one({"country_id": "pakistan"}, {"_id": 0, "name": 1, "continent": 1})
    kg_country = await db.countries.find_one({"country_id": "kyrgyzstan"}, {"_id": 0, "name": 1, "continent": 1})

    pk_landmarks = await db.landmarks.count_documents({"country_id": "pakistan"})
    kg_landmarks = await db.landmarks.count_documents({"country_id": "kyrgyzstan"})

    total_countries = await db.countries.count_documents({})
    total_landmarks = await db.landmarks.count_documents({})

    print("=" * 50)
    print("PAKISTAN / KYRGYZSTAN STATUS IN ATLAS")
    print("=" * 50)
    print(f"Pakistan country doc       : {pk_country}")
    print(f"Pakistan landmarks count   : {pk_landmarks}  (expected: 10)")
    print()
    print(f"Kyrgyzstan country doc     : {kg_country}")
    print(f"Kyrgyzstan landmarks count : {kg_landmarks}  (expected: 0)")
    print()
    print(f"TOTAL countries in DB      : {total_countries}  (expected: 100)")
    print(f"TOTAL landmarks in DB      : {total_landmarks}  (expected: 1500)")
    print("=" * 50)

    # Verdict
    if pk_country and pk_landmarks == 10 and not kg_country and kg_landmarks == 0:
        print("VERDICT: All good. Migration NOT needed.")
    elif pk_country and pk_landmarks > 0 and not kg_country:
        print("VERDICT: Pakistan exists, Kyrgyzstan gone. Likely fine — "
              "but landmark count doesn't match expected 10. Investigate before migrating.")
    else:
        print("VERDICT: Migration likely needed. Run replace_kyrgyzstan_pakistan.py next.")

    client.close()


if __name__ == "__main__":
    asyncio.run(check())
