"""Final batch: fix last 7 true near-duplicates on production.
Run on Render: cd scripts && python3 fix_prod_final_dupes.py && python3 db_compare.py
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'wandermark')]

FIXES = [
    ("samoa", "Sua Ocean Trench", "Apia Clock Tower", "Iconic memorial tower in the heart of Samoa's capital, a symbol of the city's German colonial era."),
    ("seychelles", "Morne Seychellois Peak", "Fond Ferdinand Reserve", "Nature reserve on Praslin with endemic coco de mer palms and panoramic island views."),
    ("south_korea", "Boseong Green Tea Fields", "Bukhansan Granite Peaks", "Dramatic granite mountain fortress park within Seoul's northern boundary."),
    ("tunisia", "Star Wars Mos Espa Set", "Kerkouane Punic Ruins", "UNESCO ruins of the only surviving Phoenician-Punic city, preserved for 2,000 years."),
    ("vietnam", "Phong Nha Cave System", "Ban Gioc Waterfall", "Southeast Asia's largest transborder waterfall on the Chinese-Vietnamese border."),
    ("bahamas", "Exuma Thunderball Grotto", "Long Island Columbus Monument", "Monument at the site where Columbus first landed in the New World in 1492."),
    ("mauritius", "Underwater Waterfall Illusion", "Chamarel Waterfall", "Tallest single-drop waterfall in Mauritius plunging 100m through lush forest."),
    # Also fix France formatting issue
    ("france", "French Riviera (Côte d'Azur)", "Gorges du Verdon", "Europe's Grand Canyon with turquoise river and dramatic limestone cliffs."),
]


async def fix():
    fixed = 0
    for cid, old_name, new_name, new_desc in FIXES:
        lm = await db.landmarks.find_one({"country_id": cid, "name": old_name}, {"_id": 1})
        if not lm:
            print(f"  SKIP (not found): {cid}/{old_name}")
            continue
        exists = await db.landmarks.find_one({"country_id": cid, "name": new_name})
        if exists:
            print(f"  SKIP (exists): {cid}/{new_name}")
            continue
        await db.landmarks.update_one({"_id": lm["_id"]}, {"$set": {"name": new_name, "description": new_desc}})
        fixed += 1
        print(f"  OK: {cid}/{old_name} -> {new_name}")

    print(f"\nFixed: {fixed}")
    t = await db.landmarks.count_documents({})
    print(f"Total: {t}")
    client.close()

if __name__ == "__main__":
    asyncio.run(fix())
