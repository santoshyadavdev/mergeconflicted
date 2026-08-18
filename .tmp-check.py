import json, urllib.request

U = "AgentEnder"
H = {"Accept": "application/vnd.github+json", "User-Agent": "mergeconflicted-app"}


def get(url):
    req = urllib.request.Request(url, headers=H)
    try:
        return json.load(urllib.request.urlopen(req))
    except Exception as e:
        print("FAILED", url, "->", e)
        return None


search = get(
    "https://api.github.com/search/issues?q=reviewed-by:%s+type:pr&sort=updated&order=desc&per_page=20" % U
)
items = search.get("items", []) if search else []
print("total_count:", search.get("total_count") if search else None, "| items:", len(items))

bodies = []
states = {}
for it in items:
    repo = it["repository_url"].split("/repos/")[-1]
    rs = get("https://api.github.com/repos/%s/pulls/%s/reviews?per_page=100" % (repo, it["number"]))
    if not rs:
        continue
    for r in rs:
        if r.get("user") and r["user"]["login"].lower() == U.lower():
            st = r["state"].lower()
            states[st] = states.get(st, 0) + 1
            b = r.get("body") or ""
            if b:
                bodies.append(("review", len(b), b, "%s#%s" % (repo, it["number"])))

ev = get("https://api.github.com/users/%s/events/public?per_page=100" % U) or []
for e in ev:
    if e["type"] == "PullRequestReviewCommentEvent" and e["payload"].get("comment"):
        b = e["payload"]["comment"].get("body") or ""
        if b:
            bodies.append(("inline", len(b), b, e["repo"]["name"]))

print("states:", states)
print("")
print("TOP LONGEST:")
for kind, n, b, where in sorted(bodies, key=lambda x: -x[1])[:10]:
    print("%-7s %6d chars | %-18s | %s" % (kind, n, where, repr(b[:70])))

lens = [n for _, n, _, _ in bodies]
if lens:
    print("")
    print("count :", len(lens))
    print("avg   :", round(sum(lens) / len(lens)))
    print("median:", sorted(lens)[len(lens) // 2])
    print("max   :", max(lens))
