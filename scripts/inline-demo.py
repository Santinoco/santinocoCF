"""Junta dist-demo/ en un único HTML (demo.html) con el JS y CSS adentro."""
import pathlib, re, sys
root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'dist-demo')
html = (root / 'index.html').read_text()
def css(m):
    return '<style>' + (root / m.group(1)).read_text() + '</style>'
def js(m):
    code = (root / m.group(1)).read_text().replace('</script', '<\\/script')
    return '<script type="module">' + code + '</script>'
html = re.sub(r'<link rel="stylesheet"[^>]*href="\./([^"]+)"[^>]*>', css, html)
html = re.sub(r'<script type="module"[^>]*src="\./([^"]+)"[^>]*></script>', '', html)
# el JS va al final del body para que #root exista
main = next((root / 'assets').glob('index-*.js'))
html = html.replace('</body>', js(re.match(r'(.*)', 'assets/' + main.name)) + '</body>')
html = re.sub(r'<link rel="icon"[^>]*>', '', html)
(root / 'demo.html').write_text(html)
# versión sin <html>/<head>/<body> para publicar como artifact
head = re.search(r'<head>(.*)</head>', html, re.S).group(1)
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
head = re.sub(r'<meta (charset|name="viewport")[^>]*>', '', head)
(root / 'demo-artifact.html').write_text(head.strip() + '\n' + body.strip())
print('ok', len(html) // 1024, 'KB')
