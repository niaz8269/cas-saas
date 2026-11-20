"""
Builds page_text.json: the text of the main public pages as crawlers should read it.

The website shows this text from the English locale file; search engines and AI crawlers that do not run the
page script only see what the server prints. Run this after changing the English copy of these pages:

    python backend/database/data/build_page_text.py

Only text that is already shown to visitors is exported. Numbers that the website fills from the live catalog
are left out here; the server adds live counts itself.
"""

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
en = json.load(open(os.path.join(ROOT, "frontend", "src", "i18n", "locales", "en.json"), encoding="utf-8"))


def clean(text):
    return " ".join(str(text).replace("—", "-").split())


def titled(items):
    """[{title, body}] or {key: {title, body}} -> "Title: body" lines."""
    rows = items.values() if isinstance(items, dict) else items
    return [f"{clean(r['title'])}: {clean(r['body'])}" for r in rows]


why, services, about, pricing, partner = en["whyChina"], en["services"], en["about"], en["pricing"], en["partner"]

pages = {
    "site/why-china": {
        "h1": why["title"],
        "intro": why["subtitle"],
        "sections": [
            {"h": why["reasonsTitle"], "p": [why["reasonsSubtitle"]], "ul": titled(why["reasons"])},
        ],
        "links": [["/site/programs", "Find a program"], ["/site/scholarships", "Scholarships"], ["/site/mbbs-in-china", "MBBS in China"], ["/site/cities", "Study in China by city"]],
    },
    "site/services": {
        "h1": services["title"],
        "intro": services["subtitle"],
        "sections": [
            {"h": services["whatWeDoTitle"], "p": [services["whatWeDoSubtitle"]], "ul": titled(services["items"])},
            {"h": services["whyChooseTitle"], "p": [services["whyChooseSubtitle"]], "ul": titled(services["why"])},
        ],
        "links": [["/site/pricing", "What CAS charges"], ["/site/study-plan", "Get a free study plan"], ["/site/contact", "Contact CAS"]],
    },
    "site/about": {
        "h1": about["headerTitle"],
        "intro": about["headerSubtitle"],
        "sections": [
            {"h": about["promiseTitle"], "p": [about["promiseSubtitle"]], "ul": [
                f"{about['promiseFeesTitle']}: {about['promiseFeesBody']}",
                f"{about['promiseTrackTitle']}: {about['promiseTrackBody']}",
                f"{about['promiseReachTitle']}: {about['promiseReachBody']}",
            ]},
            {"h": about["whyTitle"], "p": [about["whySubtitle"]], "ul": [about[f"whyPoint{i}"] for i in range(1, 5)]},
            {"h": about["helpTitle"], "p": [about["helpSubtitle"]], "ul": [
                f"{about['stepChooseTitle']}: {about['stepChooseBody']}",
                f"{about['stepApplyTitle']}: {about['stepApplyBody']}",
                f"{about['stepOfferTitle']}: {about['stepOfferBody']}",
                f"{about['stepArriveTitle']}: {about['stepArriveBody']}",
            ]},
            {"h": about["missionLabel"], "p": ["CAS " + about["missionText"]]},
        ],
        "links": [["/site/services", "Our services"], ["/site/pricing", "What CAS charges"], ["/site/contact", "Contact CAS"]],
    },
    "site/pricing": {
        "h1": pricing["headerTitle"],
        "intro": pricing["headerSubtitle"],
        "sections": [
            {"h": pricing["costTitle"], "p": [pricing["costSubtitle"], pricing["costNote"]]},
            {"h": pricing["budgetTitle"], "p": [pricing["budgetSubtitle"]], "ul": pricing["budget"]},
            {"h": pricing["scholarshipTitle"], "p": [pricing["scholarshipBody"].rstrip(":") .replace(" The scholarships currently active in our catalog", "")]},
            {"h": pricing["casTitle"], "p": [pricing["casSubtitle"]]},
            {"h": pricing["freeCardTitle"] + " (" + pricing["freeBadge"].lower() + ")", "ul": [pricing[f"free{i}"] for i in range(1, 5)]},
            {"h": pricing["servicesIntro"], "ul": titled(pricing["service"]), "p": [pricing["quoteNote"]]},
            {"h": pricing["stepsTitle"], "ul": titled(pricing["steps"])},
        ],
        "links": [["/site/scholarships", "Browse scholarships"], ["/site/study-plan", "Get a free study plan"], ["/site/programs", "Find a program"]],
    },
    "site/partner": {
        "h1": partner["headerTitle"],
        "intro": partner["headerSubtitle"],
        "sections": [
            {"h": partner["whyTitle"], "p": [partner["whySubtitle"]], "ul": titled(partner["benefit"])},
            {"h": partner["portalTitle"], "p": [partner["portalSubtitle"]], "ul": titled(partner["portal"])},
            {"h": partner["stagesTitle"], "p": [partner["stagesSubtitle"]], "ul": titled(partner["stages"])},
            {"h": partner["howTitle"], "ul": titled(partner["steps"]), "p": [partner["stagesNote"]]},
            {"h": partner["fitTitle"], "ul": partner["fit"]},
        ],
        "links": [["/site/contact", "Talk to us first"], ["/site/universities", "Universities in China"], ["/site/mbbs-in-china", "MBBS in China"]],
    },
}


def tidy(node):
    if isinstance(node, dict):
        return {k: tidy(v) for k, v in node.items()}
    if isinstance(node, list):
        return [tidy(v) for v in node]
    return clean(node)


out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "page_text.json")
json.dump(tidy(pages), open(out, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=2)
print({k: sum(len(str(x).split()) for x in json.dumps(v).split()) for k, v in pages.items()})
