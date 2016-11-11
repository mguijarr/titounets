import os
import requests
import urlparse
from bs4 import BeautifulSoup
import locale
import re
import sys

CAF_URL = "https://wwwd.caf.fr/wpr-cafpro-web/servlet/ServletAccesCAFPro"
CAF_MENU = "https://wwwd.caf.fr/wpr-cafpro-web/servlet/ServletMenuProfil"
CAF_PROFILE = "https://wwwd.caf.fr/wpr-cafpro-web/PrincipalHautT2.jsp"
CAF_ACCESS = "https://wwwd.caf.fr/wpr-cafpro-web/servlet/ServletAccesRubrique"
CAF_QF = (1, "/QFCNAFType1.jsp")
CAF_CHILDREN = (2, "/EnfantAutPersType1.jsp")
CAF_ADDRESS = (3, "/AdresseType1.jsp")

USERNAME, PASSWORD = eval(file(os.path.join(os.path.dirname(__file__), "caf.passwd")).read())
REFERER = "https://wwwd.caf.fr/wpr-cafpro-web/Ident.jsp"
try:
  MATRICULE = sys.argv[1]
except:
  MATRICULE = "1137640"

locale.setlocale(locale.LC_NUMERIC, 'fr_FR.UTF-8')

with requests.Session() as s:
  s.headers.update({'referer': REFERER})
  r = s.post(CAF_URL, data={"id": USERNAME, "password": PASSWORD, "valid": "Valider", "modeAcces":"connexion"})

  #print r.status_code, r.reason
  #print r.text

  rr = s.get(CAF_MENU, params={"cleMatricule": MATRICULE, "Form":"Consulter"})

  #print rr.status_code, rr.reason
  #print rr.text

  params = urlparse.parse_qs(urlparse.urlparse(rr.request.url).query)

  rr = s.get(CAF_PROFILE)

  soup = BeautifulSoup(rr.text, "lxml")

  parents = [] 
  for p in [x.text.strip() for x in soup.find_all("b", string=lambda s: any(["Madame" in str(s), "Monsieur" in str(s)]))]:
    if "responsable" in p:
      parents.insert(0, re.search("[A-Z\s]+"*2, p).group().strip())
    else:
      parents.append(re.search("[A-Z\s]+"*2, p).group().strip())

  print parents

  nr, page = CAF_QF
  params.update({"numRubrique": nr, "habilitation":"L", "page":page})
  rrr = s.get(CAF_ACCESS, params=params)

  result = rrr.text

  soup = BeautifulSoup(result, 'lxml')

  for td in soup.find_all("td"):
    if "QF :" in td.text:
      break


  x = locale.atof(re.search("\d+\,\d{2}", td.text.split(':')[-1]).group())

  print x

  nr, page = CAF_ADDRESS
  params.update({"numRubrique": nr, "habilitation":"L", "page":page})
  rrrr = s.get(CAF_ACCESS, params=params)

  soup = BeautifulSoup(rrrr.text, 'lxml')

  address = [soup.find(property='voie').find("td").text.strip(),
             soup.find(property='lieuDit').find("td").text.strip(),
             soup.find(property='codePostLocalite').find("td").text.strip()]

  print "\n".join(address)

  nr, page = CAF_CHILDREN
  params.update({"numRubrique": nr, "habilitation":"L", "page":page})
  rrrrr = s.get(CAF_ACCESS, params=params)

  soup = BeautifulSoup(rrrrr.text, "lxml")
  children_nodes = [x.parent for x in soup.find_all("td", string=lambda s: re.search("[0-9]{2}/[0-9]{2}/[0-9]{4}", s) if s else False)]
  children = []
  for child_node in children_nodes:
    children.append(filter(None, [x.text.strip()  for x in child_node.find_all("td")]))
    child = children[-1]
    child[-1] = re.search("[0-9]{2}/[0-9]{2}/[0-9]{4}", child[-1]).group()
  print children


