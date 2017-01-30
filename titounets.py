from flask import Flask, session, request, jsonify, make_response
from flask_compress import Compress
from flask_session import Session
import redis
import os
import caf
import bcrypt
from holidays import get_holidays
import json
import dateutil.parser
import pytz
import ast

password = file(os.path.join(os.path.dirname(__file__), "redis.passwd"), "r").read()
db = redis.Redis(host='localhost', port=6379, db=0, password=password.strip())

app = Flask("titounets", static_url_path='', static_folder='')
Compress(app)
SESSION_TYPE = 'redis'
SESSION_REDIS = db
app.config.from_object(__name__)
Session(app)

@app.route("/")
def index():
    session.clear()
    return app.send_static_file("welcome.html")

@app.route("/<etablissement>")
def show_login(etablissement):
    if session.get("etablissement", etablissement) != etablissement:
      return make_response("", 401)

    ets = file(os.path.join(os.path.dirname(__file__), "etablissements.cfg"), "r").read()
    ets_dict = ast.literal_eval(ets)
    et = ets_dict.get(etablissement)
    db_id = et.get("id")
    if db_id is None:
      return make_response("", 404)
    caf_username, caf_passwd = et["caf"]
    caf.USERNAME = caf_username; caf.PASSWORD = caf_passwd 
      
    session["etablissement"] = etablissement
    global db
    db = redis.Redis(host='localhost', port=6379, db=db_id, password=password.strip())

    return app.send_static_file('index.html')

@app.route("/api/holidays")
def holidays():
    return jsonify(get_holidays())

@app.route("/api/login", methods=["POST"])
def login():
    content = request.get_json()
    username = str(content['username'])
    password = str(content['password'])

    passwd_hash = db.hget(username, "password")
    logged_in = passwd_hash == bcrypt.hashpw(password, passwd_hash)
    admin = db.hget(username, "admin") == 'True'

    session['admin'] = admin
    session['username'] = username

    return jsonify({ 'success': logged_in, "admin": admin })

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return make_response("", 200)

def extract_family_data(username):
    family = db.hgetall(username)

    family["children"] = []
    for k in db.keys("%s:children:*" % username):
        if 'periods' in k:
            continue
        family["children"].append(db.hgetall(k))

    family.pop("password")
    family['address'] = { "street": [family.pop("address1"), family.pop("address2")],
                          "city": family.pop("city"),
                          "zip": family.pop("zip") }
    family['parents'] = [family.pop('parent1'), family.pop('parent2')]

    return family

def extract_families():
    families = []

    for k in db.keys('*'):
      if k == 'admin' or k.startswith('session:') or k.startswith("parameters"):
        continue
      if not ':children:' in k:
        families.append(extract_family_data(k))
    
    return families

@app.route("/api/families", methods=["GET"])
def get_families():
    if not session['admin']:
      return make_response("", 401)   
    
    return jsonify(extract_families())

@app.route("/api/children/<date>", methods=["GET"])
def get_children(date):
    if not session['admin']:
      return make_response("", 401)   
    
    child_periods_keys = db.keys("*:children:*:periods")
    result = list()
    day = dateutil.parser.parse(date).date()
    local_tz = pytz.timezone("Europe/Paris")

    for k in child_periods_keys:
      username,_,child_index,_ = k.split(":")
      family_data = extract_family_data(username)
      child = family_data["children"][int(child_index)]

      periods = map(json.loads, db.lrange(k, 0, -1))
      date_ranges = list()
      for i, p in enumerate(periods):
        date_ranges.append((i, dateutil.parser.parse(p["range"]["start"]), dateutil.parser.parse(p["range"]["end"]))) 
  
      for period_index, start, end in date_ranges:
        start = start.replace(tzinfo=pytz.utc).astimezone(local_tz).replace(tzinfo=None)
        end = end.replace(tzinfo=pytz.utc).astimezone(local_tz).replace(tzinfo=None)
        if start.date() <= day <= end.date():
          timetable = periods[period_index]["timetable"]
          hours = timetable[str(day.weekday()+1)]
          print hours
          if hours:
            contract_start_time = hours[0]
            contract_end_time = hours[1]
          result.append((child['surname'], child['name'], username, contract_start_time, contract_end_time))

    result.sort()

    print result

    children = []
    for child in result:
      children.append({ "surname": child[0], "name": child[1], "id": child[2], "contractStart":child[3], "contractEnd": child[4], "hours":{} })
    
    return jsonify(children)   

@app.route("/api/periods/<int:username>", methods=["GET"])
def get_children_periods(username):
    if session['admin'] or int(session["username"]) == username:
        family = extract_family_data(username)
        res = dict()
        for i, c in enumerate(family['children']):
           key = "%d:children:%s:periods" % (username, i) 
           res[c["name"]] = map(json.loads, db.lrange(key, 0, -1)) or []

        return jsonify(res)
    else:
        return make_response("", 401)

@app.route("/api/periods/<int:username>", methods=["POST"])
def set_children_periods(username):
    if session['admin'] or int(session["username"]) == username:
        periods = request.get_json()
        family_data = extract_family_data(username)
        for child_name in periods:
           i = [child_name==c["name"] for c in family_data["children"]].index(True)
           key = "%d:children:%s:periods" % (username, i)
           plist = map(json.dumps, periods[child_name])
           with db.pipeline() as P:
               P.delete(key)
               if plist:
                   P.rpush(key, *plist)
               P.execute()

        return make_response("", 200) 
    else:
        return make_response("", 401)
   
@app.route("/api/delfamily", methods=["POST"])
def del_family():
    if not session['admin']:
      return make_response("", 401)   
    
    content = request.get_json()
    username = content["username"]

    children = db.keys(username+':children:*')

    with db.pipeline() as p:
      p.delete(username)
      for c in children:
        p.delete(c)
      p.execute()

    return jsonify(extract_families())

@app.route("/api/family/<int:username>", methods=["GET"])
def get_family(username):
    if session['admin'] or int(session["username"]) == username:
        return jsonify(extract_family_data(username))
    else:
        return make_response("", 401)

@app.route("/api/save", methods=["POST"])
def save():
    if not session['admin']:
      return make_response("", 401)

    content = request.get_json()
    username = content["username"]
    parent1, parent2 = content["parents"]
    address1, address2 = content["address"]["street"]
    zip = content["address"]["zip"]
    city = content["address"]["city"]
    phone_number = content["phone_number"]
    email = content["email"]
    qf = content["qf"]
    children = content["children"]
  
    if not db.exists(username):
        # new family !
        password = str(username)

        salt = bcrypt.gensalt()    
        passwd_hash = bcrypt.hashpw(password, salt)
    else:
        passwd_hash = None

    with db.pipeline() as p:
        p.hset(username, "admin", False)
        if passwd_hash is not None:
            p.hset(username, "password", passwd_hash)
        p.hset(username, "email", email) 
        p.hset(username, "address1", address1)
        p.hset(username, "address2", address2)
        p.hset(username, "parent1", parent1)
        p.hset(username, "parent2", parent2)
        p.hset(username, "zip", zip)
        p.hset(username, "city", city)
        p.hset(username, "phone_number", phone_number)
        p.hset(username, "qf", qf)
        p.hset(username, "id", username)
        for i, child_data in enumerate(children):
          key = "%s:children:%d" % (username, i) 
          p.hset(key, "name", child_data["name"])
          p.hset(key, "surname", child_data["surname"])
          p.hset(key, "birthdate", child_data["birthdate"])
        p.execute()

    return make_response("", 200)

@app.route("/api/caf", methods=["POST"])
def retrieve_caf_data():
  """{'address': {'city': u'ST LAURENT DU PONT', 'street': [u'1579 CHEMIN DES COTES DE VILLETTE', u''], 'zip': u'38380'}, 'parents': [u'SAMIRA ACAJJAOUI', u'MATHIAS GUIJARRO'], 'children': [{'surname': u'GUIJARRO', 'name': u'ELIAS', 'birthdate': '2013-06-15T00:00:00'}, {'surname': u'GUIJARRO', 'name': u'SARA', 'birthdate': '2011-09-06T00:00:00'}], 'qf': 77785.0}
  """
  if not session["admin"]:
    return make_response("", 401)

  content = request.get_json()
  caf_id = content['id']

  result = caf.get_data(caf_id)

  return jsonify(result)

@app.route("/api/parameters", methods=["GET"])
def get_parameters():
  params = db.hgetall("parameters")
  params['address'] = ast.literal_eval(params.pop("address", '{}'))
  params['closedPeriods'] = ast.literal_eval(params.pop("closedPeriods", '[]'))
  return jsonify(params)

@app.route("/api/saveParameters", methods=["POST"])
def save_parameters():
  if not session["admin"]:
    return make_response("", 401)

  content = request.get_json()

  for key, val in content.iteritems():
    db.hset("parameters", key, val)

  return make_response("", 200)

@app.route("/api/allowContractChanges", methods=["POST"])
def allow_contract_changes():
    if not session["admin"]:
        return make_response("", 401)

    content = request.get_json()

    db.hset("parameters", "contractChangesAllowed", "1" if content["allowChanges"] else "0")

    return make_response("", 200)

@app.route("/api/calendar", methods=["GET"])
def get_calendar():
  pass


if __name__ == '__main__':
  app.run(host="0.0.0.0", port=5000)

