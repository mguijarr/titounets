from flask import Flask, session, request, jsonify, make_response, redirect
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

REDIS_PASSWORD = file(os.path.join(os.path.dirname(__file__), "redis.passwd"), "r").read()
REDIS_PASSWORD = REDIS_PASSWORD.strip()

app = Flask("titounets", static_url_path='', static_folder='')
Compress(app)
SESSION_TYPE = 'redis'
SESSION_REDIS = redis.Redis(host='localhost', port=6379, db=0, password=REDIS_PASSWORD)
app.config.from_object(__name__)
Session(app)

def get_db_et(et, dbs={}, ets_dict={}):
  try:
    et_dict = ets_dict[et]
  except KeyError:
    ets = file(os.path.join(os.path.dirname(__file__), "etablissements.cfg"), "r").read()
    ets_dict.update(ast.literal_eval(ets))
    et_dict = ets_dict[et]
  try:
    db = dbs[et]
  except KeyError:
    db_id = et_dict["id"]  
    db = redis.Redis(host='localhost', port=6379, db=db_id, password=REDIS_PASSWORD)
    dbs[et] = db
  return db, et_dict

@app.route("/")
def index():
    return redirect("index.html")

@app.route("/api/etablissements")
def get_establishment_list():
    ets = file(os.path.join(os.path.dirname(__file__), "etablissements.cfg"), "r").read()
    ets_dict = ast.literal_eval(ets)

    return jsonify(sorted([[k, v["name"]] for k, v in ets_dict.iteritems()], key=lambda x: x[1]))
    
@app.route("/api/holidays")
def holidays():
    return jsonify(get_holidays())

@app.route("/api/login", methods=["POST"])
def login():
    content = request.get_json()
    et = str(content["et"])
    username = str(content['username'])
    password = str(content['password'])
    
    db, etablissement = get_db_et(et)
    session["caf"] = etablissement["caf"]
    db_id = etablissement["id"]
    session["etablissement"] = et

    passwd_hash = db.hget(username, "password")
    logged_in = passwd_hash == bcrypt.hashpw(password, passwd_hash)
    admin = db.hget(username, "admin") == 'True'

    session['admin'] = admin
    session['username'] = username

    return jsonify({ 'success': logged_in, "admin": admin, "etName": etablissement["name"] })

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return make_response("", 200)

def extract_family_data(db, username):
    db, _ = get_db_et(session["etablissement"])
    family = db.hgetall(username)

    family["children"] = {}
    for k in db.scan_iter(match="%s:children:*" % username):
        if 'periods' in k:
            continue
        child_name = k.split(":")[-1].replace(" ", "_")
        family["children"][child_name] = db.hgetall(k)
        if bool(int(family["children"][child_name].get("present", "1"))):
          family["children"][child_name]["present"] = "1"
        else:
          family["children"][child_name]["present"] = "0"

    try:
        family.pop("password")
    except KeyError:
        return family

    family['address'] = { "street": [family.pop("address1"), family.pop("address2")],
                          "city": family.pop("city"),
                          "zip": family.pop("zip") }
    family['parents'] = [family.pop('parent1'), family.pop('parent2')]
    if not 'till' in family:
      family['till'] = 'Grenoble'
    if not 'rate' in family:
      family['rate'] = None
    if not 'CAFrate' in family:
      family['CAFrate'] = True
    else:
      family["CAFrate"] = bool(family["CAFrate"] == "True")
    return family

def extract_families(db):
    families = []

    for k in db.scan_iter(): #keys('*'):
      if k == 'admin' or k.startswith('session:') or k.startswith("parameters") or k.endswith("hours") or k.endswith("bills"):
        continue
      if not ':children:' in k:
        families.append(extract_family_data(db, k))
    
    return families

@app.route("/api/families", methods=["GET"])
def get_families():
    if not session.get('admin'):
      return make_response("", 401)

    db, _ = get_db_et(session["etablissement"])
    
    return jsonify(extract_families(db))

@app.route("/api/children/<date>", methods=["GET"])
def get_children(date):
    if not session.get('admin'):
      return make_response("", 401)   
    
    db, _ = get_db_et(session["etablissement"])
    result = list()
    day = dateutil.parser.parse(date).date()
    local_tz = pytz.timezone("Europe/Paris")

    for k in db.scan_iter(match="*:children:*"): #:periods"):
      username,_,child_name = k.split(":")[:3]
      if ':periods' in k:
        continue
      family_data = extract_family_data(db, username)
      child = family_data["children"][child_name]
      if not bool(int(child.get("present", "1"))):
        continue        

      periods = map(json.loads, db.lrange(k+":periods", 0, -1))
      date_ranges = list()
      for i, p in enumerate(periods):
        date_ranges.append((i, dateutil.parser.parse(p["range"]["start"]), dateutil.parser.parse(p["range"]["end"]))) 
  
      for period_index, start, end in date_ranges:
        start = start.replace(tzinfo=pytz.utc).astimezone(local_tz).replace(tzinfo=None)
        end = end.replace(tzinfo=pytz.utc).astimezone(local_tz).replace(tzinfo=None)
        if start.date() <= day <= end.date():
          timetable = periods[period_index]["timetable"]
          contract_hours = timetable.get(str(day.weekday()+1))
          if contract_hours:
            contract_start_time = contract_hours[0]
            contract_end_time = contract_hours[1]
            result.append((child['surname'], child['name'], username, contract_start_time, contract_end_time))
            break
      else:
          result.append((child['surname'], child['name'], username, None, None))
    result.sort()

    children = []
    for surname, name, username, contract_start, contract_end in result:
      try:
        hours = ast.literal_eval(db.hget("%s:%s:hours" % (username, name), day.isoformat()))
      except ValueError:
        hours = None
      children.append({ "surname": surname, "name": name, "id": username, "contractStart": contract_start, "contractEnd": contract_end, "hours": hours })
    
    return jsonify(children)   

@app.route("/api/childHours", methods=["POST"])
def set_child_hours():
    if not session.get('admin'):
      return make_response("", 401)

    db, _ = get_db_et(session["etablissement"])

    data = request.get_json()

    date = data["date"]
    day = dateutil.parser.parse(date).date()
    hours = data["hours"] 
    name = data["name"].replace(" ", "_")
    
    db.hset("%s:%s:hours" % (data["id"], name), day.isoformat(), str(hours))

    return make_response("", 200)


@app.route("/api/childHours/<username>", methods=["GET"])
def get_child_hours(username):
    if not session.get('admin') and session.get("username") != username:
        return make_response("", 401)
 
    db, _ = get_db_et(session["etablissement"])
    ret = {}

    for k in db.scan_iter(match="%s:*:hours" % username):
        _, childName, _ = k.split(":")
        ret[childName] = db.hgetall(k)
        for day in ret[childName]:
          hoursString = ret[childName][day]
          hours = map(float, ast.literal_eval(hoursString))
          ret[childName][day] = hours

    return jsonify(ret)
        

@app.route("/api/periods/<username>", methods=["GET"])
def get_children_periods(username):
    db, _ = get_db_et(session["etablissement"])
    if session.get('admin') or session.get("username") == username:
        family = extract_family_data(db, username)
        res = { "rate": { "CAF": family["CAFrate"], "rate": family["rate"] } }
        periods = {}
        res["periods"] = periods
        for child_name, c in family['children'].iteritems():
           if not bool(int(c.get("present", "1"))):
             continue
           key = "%s:children:%s:periods" % (username, child_name.replace(" ", "_")) 
           periods[c["name"]] = map(json.loads, db.lrange(key, 0, -1)) or []

        return jsonify(res)
    else:
        return make_response("", 401)

@app.route("/api/periods/<username>", methods=["POST"])
def set_children_periods(username):
    db, _ = get_db_et(session["etablissement"])
    if session.get('admin') or session.get("username") == username:
        r = request.get_json()
        key = "%s" % username
        periods = r['periods']
        rate = r['rate']
        family_data = extract_family_data(db, username)
        with db.pipeline() as P:
          P.hset(key, "rate", rate["rate"])
          P.hset(key, "CAFrate", rate["CAF"])
          for child_name in periods:
            pkey = key+":children:%s:periods" % (child_name.replace(" ", "_"))
            plist = map(json.dumps, periods[child_name])
            P.delete(pkey)
            if plist:
               P.rpush(pkey, *plist)
          P.execute()

        return make_response("", 200)
    else:
        return make_response("", 401)
   
@app.route("/api/delfamily", methods=["POST"])
def del_family():
    if not session.get('admin'):
      return make_response("", 401)   
    db, _ = get_db_et(session["etablissement"])
    
    content = request.get_json()
    username = content["username"]

    with db.pipeline() as p:
      for x in db.scan_iter(match=username+"*"):
        p.delete(x)
      p.execute()

    return jsonify(extract_families(db))

@app.route("/api/delchild", methods=["POST"])
def del_child():
    if not session.get('admin'):
      return make_response("", 401)
    db, _ = get_db_et(session["etablissement"])

    content = request.get_json()
    username = int(content["username"])
    child_name = content["child_name"].replace(" ", "_")
    key = "%s:children:%s" % (username, child_name)   
 
    with db.pipeline() as p:
        p.delete(key)
        p.delete(key+":periods")
        p.delete("%s:%s:hours" % (username, child_name))
        p.execute()

    return jsonify(extract_family_data(db, username))

@app.route("/api/family/<username>", methods=["GET"])
def get_family(username):
    db, _ = get_db_et(session["etablissement"])
    if session.get('admin') or session.get("username") == username:
        return jsonify(extract_family_data(db, username))
    else:
        return make_response("", 401)

@app.route("/api/save", methods=["POST"])
def save():
    if not session.get('admin'):
      return make_response("", 401)
    db, _ = get_db_et(session["etablissement"])

    content = request.get_json()
    username = content["username"]
    till = content["till"]
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

    saved_children = []

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
        p.hset(username, "till", till)
        for child_name, child_data in children.iteritems():
          key = "%s:children:%s" % (username, child_data["name"].replace(" ", "_")) 
          saved_children.append(child_name)
          p.hset(key, "name", child_data["name"])
          p.hset(key, "surname", child_data["surname"])
          p.hset(key, "birthdate", child_data["birthdate"])
          p.hset(key, "present", child_data.get("present", "1"))
        p.execute()

    for k in db.scan_iter(match=username+":children:*"):
       try:
         _, _, child_name = k.split(":")
       except Exception:
         continue
       child_name = child_name.replace("_", " ")
       if not child_name in saved_children:
         db.delete(k)
         db.delete(k+":periods")

    return make_response("", 200)

@app.route("/api/caf", methods=["POST"])
def retrieve_caf_data():
  """{'address': {'city': u'ST LAURENT DU PONT', 'street': [u'1579 CHEMIN DES COTES DE VILLETTE', u''], 'zip': u'38380'}, 'parents': [u'SAMIRA ACAJJAOUI', u'MATHIAS GUIJARRO'], 'children': {'ELIAS': {'surname': u'GUIJARRO', 'name': u'ELIAS', 'birthdate': '2013-06-15T00:00:00'}, 'SARA': {'surname': u'GUIJARRO', 'name': u'SARA', 'birthdate': '2011-09-06T00:00:00'}}, 'qf': 77785.0}
  """
  if not session.get("admin"):
    return make_response("", 401)

  content = request.get_json()
  caf_id = content['id']
  till = content['till'].encode("utf-8")
  caf_data = session["caf"][till]
  username = caf_data[0]
  password = caf_data[1]
  
  result = caf.get_data(caf_id, username, password)

  return jsonify(result)

@app.route("/api/caftills", methods=["GET"])
def get_caf_tills():
  if not session.get("admin"):
    return make_response("", 401)

  return jsonify(session["caf"].keys())

@app.route("/api/parameters", methods=["GET"])
def get_parameters():
  db, _ = get_db_et(session["etablissement"])
  params = db.hgetall("parameters")
  params['address'] = ast.literal_eval(params.pop("address", '{}'))
  params['closedPeriods'] = ast.literal_eval(params.pop("closedPeriods", '[]'))
  return jsonify(params)

@app.route("/api/saveParameters", methods=["POST"])
def save_parameters():
  if not session.get("admin"):
    return make_response("", 401)

  db, _ = get_db_et(session["etablissement"])
  content = request.get_json()

  for key, val in content.iteritems():
    db.hset("parameters", key, val)

  return make_response("", 200)

@app.route("/api/allowContractChanges", methods=["POST"])
def allow_contract_changes():
    if not session.get("admin"):
        return make_response("", 401)

    content = request.get_json()

    db, _ = get_db_et(session["etablissement"])
    db.hset("parameters", "contractChangesAllowed", "1" if content["allowChanges"] else "0")

    return make_response("", 200)

@app.route("/api/calendar", methods=["GET"])
def get_calendar():
  db, _ = get_db_et(session["etablissement"])

@app.route("/api/bills/<username>", methods=["GET"])
def get_bills(username):
    if not session.get('admin') and session.get("username") != username:
        return make_response("", 401)

    db, _ = get_db_et(session["etablissement"])

    params = db.hgetall("parameters")
    params['address'] = ast.literal_eval(params.pop("address", '{}'))
    params['closedPeriods'] = ast.literal_eval(params.pop("closedPeriods", '[]'))
    bills = {}
    for year, data in db.hgetall("%s:bills" % username).iteritems():
      bills[year] = json.loads(data)
    return jsonify({ "parameters": params, "bills": bills });

@app.route("/api/bills/<username>", methods=["POST"])
def save_bills(username):
    if not session.get("admin"):
        return make_response("", 401)

    db, _ = get_db_et(session["etablissement"])

    key = "%s:bills" % username

    content = request.get_json()

    with db.pipeline() as p:
      for year, data in content.iteritems():
        p.hset(key, year, json.dumps(data))
      p.execute()

    return jsonify({})

if __name__ == '__main__':
  app.run(host="0.0.0.0", port=5000)

