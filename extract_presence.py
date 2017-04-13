import unicodecsv as csv
import pprint
import sys
import redis
import os
import editdistance

REDIS_PASSWORD = file(os.path.join(os.path.dirname(__file__), "redis.passwd"), "r").read()
REDIS_PASSWORD = REDIS_PASSWORD.strip()

months = { "JANVIER": 1,
           "FEVRIER": 2,
           "MARS": 3,
           "AVRIL": 4,
           "MAI": 5,
           "JUIN": 6,
           "JUILLET": 7,
           "AOUT": 8,
           "SEPTEMBRE": 9,
           "OCTOBRE": 10,
           "NOVEMBRE": 11,
           "DECEMBRE": 12 }

def convert_time(hhmm):
  hh, mm = map(int, hhmm.split(":"))
  return hh+mm/60.

def extract_presence(filename):
  dates = {}
  children = []
  
  with open(sys.argv[1],"r") as csvfile:
    r = csv.reader(csvfile)

    rows = list(r)
    day_start = 9
    
    for i, field in enumerate(rows[1]):
      if i == day_start:
        day_start += 4
        try:
            d,m,y = field.split(",")[-1].split()
        except ValueError:
            try:
                dd,d,m,y = field.split(",")[-1].split()
            except ValueError:
                break
        y = int(y)
        if y < 2000:
          y += 2000
        dates[i]=(int(d),months[m.upper()],y)
 
    for row in rows[3:]:
      fields = list(row)

      name = fields[0]
      if not name:
        break
      child =  { "name": name, "presence": [] }
      children.append(child)
      for i, date in dates.iteritems():
        if fields[i] and fields[i+1]:
          hours = [convert_time(fields[i]), convert_time(fields[i+1])]
          child["presence"].append({ "date": "%4d-%02d-%02d" % (date[2], date[1], date[0]), "hours": hours })
        else:
          continue
      if not child["presence"]:
        del children[-1]
  return children

def name_match(last_name, p1, p2=""):
  if last_name in p1+" "+p2:
    return True
  pp = p1.split()
  if len(pp)>2:
    pp = [pp[0], ' '.join(pp[1:])]
  for p in pp:
    if editdistance.eval(last_name, p) <= 2:
      return True
  pp = p2.split()
  if len(pp)>2:
    pp = [pp[0], ' '.join(pp[1:])]
  for p in pp:
    if editdistance.eval(last_name, p) <= 2:
      return True
  if '-' in last_name:
    for n in last_name.split('-'):
      if name_match(n, p1, p2):
        return True
  return False

def find_db_key(child_name, db=1, db_connection=None):
  if db_connection is None:
    db_connection = redis.Redis(host='localhost', port=6379, db=db, password=REDIS_PASSWORD)

  last_name, first_name = [x.upper().encode("utf-8") for x in child_name.split()]
  last_name = last_name.replace("_", " ")
  
  for k in db_connection.scan_iter(match="*"):
    if ":" in k:
      continue
    try:
      family_data = db_connection.hgetall(k)
    except:
      continue
    try:
      p1 = family_data["parent1"].upper()
      p2 = family_data["parent2"].upper()
    except KeyError:
      continue
    if not name_match(last_name, p1, p2):
      continue
    for kk in db_connection.scan_iter(match="%s:children:*" % k):
      parts = kk.split(":")
      if len(parts) > 3:
        continue
      child_name = parts[-1].upper()
      if editdistance.eval(child_name, first_name.upper()) <= 2:
         return kk

if __name__ == '__main__':
  children = extract_presence(sys.argv[1])
  child = children[0]["name"]
  db_connection = redis.Redis(host='localhost', port=6379, db=int(sys.argv[2]), password=REDIS_PASSWORD)
  for child in children:
    key = find_db_key(child["name"], db_connection=db_connection)  
    print key
    hours = dict()
    for presence in child["presence"]:
      db_connection.hset(key+":hours", presence["date"], presence["hours"])


