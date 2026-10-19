import os, re
path = os.path.join(os.environ.get("TEMP", "."), "qf.js")
with open(path, encoding="utf-8", errors="ignore") as f:
    t = f.read()
urls = sorted(set(re.findall(r"https://[a-zA-Z0-9._-]+\.onrender\.com[^\"'\\s]*", t)))
locals_ = sorted(set(re.findall(r"https?://(?:127\.0\.0\.1|localhost):8000/api", t)))
print("ONRENDER:")
for u in urls:
    print(u)
print("LOCAL:", locals_)
