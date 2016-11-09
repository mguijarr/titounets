import os
import requests
import urlparse
from bs4 import BeautifulSoup
from locale import *
import re

CAF_URL = "https://wwwd.caf.fr/wpr-cafpro-web/servlet/ServletAccesCAFPro"
CAF_PROFIL = "https://wwwd.caf.fr/wpr-cafpro-web/servlet/ServletMenuProfil"
CAF_QF = "https://wwwd.caf.fr/wpr-cafpro-web/servlet/ServletAccesRubrique"
"?numRubrique=1&codeOrga=388&profil=T2&id=T2871381&habilitation=L&matricule=1137640&page=/QFCNAFType1.jsp"
USERNAME, PASSWORD = eval(file(os.path.join(os.path.dirname(__file__), "caf.passwd")).read())
REFERER = "https://wwwd.caf.fr/wpr-cafpro-web/Ident.jsp"
MATRICULE = "1137640"

s = requests.Session()
s.headers.update({'referer': REFERER})
r = s.post(CAF_URL, data={"id": USERNAME, "password": PASSWORD, "valid": "Valider", "modeAcces":"connexion"})

print r.status_code, r.reason
print r.text

rr = s.get(CAF_PROFIL, params={"cleMatricule": MATRICULE, "Form":"Consulter"})

print rr.status_code, rr.reason
print rr.text

qf_params = urlparse.parse_qs(urlparse.urlparse(rr.request.url).query)
print qf_params 
qf_params.update({"numRubrique": 1, "habilitation":"L", "page":"/QFCNAFType1.jsp"})
rrr = s.get(CAF_QF, params=qf_params)

print rrr.status_code, rrr.reason
print rrr.text

result = rrr.text

soup = BeautifulSoup(result, 'html.parser')

for td in soup.find_all("td"):
  if "QF :" in td.text:
    break

setlocale(LC_NUMERIC, 'fr_FR.UTF-8')

x = atof(re.search("\d+\,\d{2}", td.text.split(':')[-1]).group())

print x

