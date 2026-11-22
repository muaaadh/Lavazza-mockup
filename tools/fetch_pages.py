import sys, os, subprocess, concurrent.futures as cf
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
def get(u):
    f = 'pages/' + u[len('/en/'):].replace('/', '__') + '.html'
    if os.path.exists(f) and os.path.getsize(f) > 20000: return f, 'cached'
    r = subprocess.run(['curl', '-sL', '-A', UA, '--max-time', '40', '-o', f, '-w', '%{http_code}', 'https://www.lavazza.com' + u], capture_output=True, text=True)
    return f, r.stdout
urls = [l.strip() for l in open('urls.txt') if l.strip()]
with cf.ThreadPoolExecutor(4) as ex:
    res = list(ex.map(get, urls))
bad = [r for r in res if r[1] not in ('200', 'cached')]
print(len(res), 'bad', bad)
