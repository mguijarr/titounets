import os
import requests
import urlparse
from bs4 import BeautifulSoup
import locale
import re
import sys
import dateutil.parser as dateparser

"""import logging
import httplib

# Debug logging
httplib.HTTPConnection.debuglevel = 1
logging.basicConfig()
logging.getLogger().setLevel(logging.DEBUG)
req_log = logging.getLogger('requests.packages.urllib3')
req_log.setLevel(logging.DEBUG)
req_log.propagate = True
"""
 
CAF_URL = "https://wwwd.caf.fr/wpr-cafpro-web/servlet/ServletAccesCAFPro"
CAF_MENU = "https://wwwd.caf.fr/wpr-cafpro-web/servlet/ServletMenuProfil"
CAF_PROFILE = "https://wwwd.caf.fr/wpr-cafpro-web/PrincipalHautT2.jsp"
CAF_ACCESS = "https://wwwd.caf.fr/wpr-cafpro-web/servlet/ServletAccesRubrique"
CAF_QF = (1, "/QFCNAFType1.jsp")
CAF_CHILDREN = (2, "/EnfantAutPersType1.jsp")
CAF_ADDRESS = (3, "/AdresseType1.jsp")

REFERER = "https://wwwd.caf.fr/wpr-cafpro-web/Ident.jsp"
try:
  MATRICULE = sys.argv[1]
except:
  MATRICULE = "1137640"

locale.setlocale(locale.LC_NUMERIC, 'fr_FR.UTF-8')

def get_data(matricule, USERNAME, PASSWORD):
  result = dict()

  with requests.Session() as s:
    s.headers.update({'referer': REFERER})
    r = s.post(CAF_URL, data={"id": USERNAME, "password": PASSWORD, "valid": "Valider", "modeAcces":"connexion"})

    rr = s.get(CAF_MENU, params={"cleMatricule": matricule, "Form":"Consulter"})

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

    result["parents"] = parents

    nr, page = CAF_QF
    params.update({"numRubrique": nr, "habilitation":"L", "page":page})
    rrr = s.get(CAF_ACCESS, params=params)

    #print rrr.status_code, rrr.reason
    #print rrr.text
    soup = BeautifulSoup(rrr.text, 'lxml')

    for td in soup.find_all("td"):
      if "QF :" in td.text:
        break

    x = locale.atof(re.search("\d+\,\d{2}", td.text.split(':')[-1]).group())

    result['qf'] = x

    nr, page = CAF_ADDRESS
    params.update({"numRubrique": nr, "habilitation":"L", "page":page})
    rrrr = s.get(CAF_ACCESS, params=params)

    soup = BeautifulSoup(rrrr.text, 'lxml')

    address = [soup.find(property='voie').find("td").text.strip(),
               soup.find(property='lieuDit').find("td").text.strip(),
               soup.find(property='codePostLocalite').find("td").text.strip()]

    result['address'] = { "street": address[0:2],
                          "zip": address[2].split(' ')[0],
                          "city": ' '.join(address[2].split(' ')[1:]) }

    nr, page = CAF_CHILDREN
    params.update({"numRubrique": nr, "habilitation":"L", "page":page})
    rrrrr = s.get(CAF_ACCESS, params=params)

    soup = BeautifulSoup(rrrrr.text, "lxml")
    children_nodes = [x.parent for x in soup.find_all("td", string=lambda s: re.search("[0-9]{2}/[0-9]{2}/[0-9]{4}", s) if s else False)]
    children = {}
    for child_node in children_nodes:
      surname, name, birthdate = filter(None, [x.text.strip()  for x in child_node.find_all("td")])
      birthdate = re.search("[0-9]{2}/[0-9]{2}/[0-9]{4}", birthdate).group()
      birthdate = dateparser.parse(birthdate).isoformat()
      children[name] = { "surname": surname, "name": name, "birthdate": birthdate }
    
    result['children'] = children

  return result

if __name__ == '__main__':
  print get_data(MATRICULE)


