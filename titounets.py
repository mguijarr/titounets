from flask import Flask, session, request, jsonify, make_response, redirect, send_from_directory, url_for
from werkzeug import secure_filename
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
import hashlib
import cStringIO

REDIS_PASSWORD = file(os.path.join(os.path.dirname(__file__), "redis.passwd"), "r").read()
REDIS_PASSWORD = REDIS_PASSWORD.strip()
UPLOAD_FOLDER = os.path.join(os.environ["HOME"], "storage") 
ALLOWED_EXTENSIONS = set(["jpg", "jpeg", "png"])

app = Flask("titounets", static_url_path='', static_folder='')
SESSION_TYPE = 'redis'
SESSION_REDIS = redis.Redis(host='localhost', port=6379, db=0, password=REDIS_PASSWORD)
app.config.from_object(__name__)
Session(app)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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

def _get_child_data(db, username, child_name):
    child_name = child_name.replace(" ", "_")
    k = "%s:children:%s" % (username, child_name)
    child_data = db.hgetall(k) 
    if bool(int(child_data.get("present", "1"))):
        child_data["present"] = "1"
    else:
        child_data["present"] = "0"
    return child_data

def extract_family_data(db, username):
    db, _ = get_db_et(session["etablissement"])
    family = db.hgetall(username)
    family.setdefault("active", "1")

    family["children"] = {}
    for k in db.scan_iter(match="%s:children:*" % username):
        if 'periods' in k or 'hours' in k:
            continue
        child_name = k.split(":")[-1].replace("_", " ")
        family["children"][child_name] = _get_child_data(db, username, child_name)

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

def extract_families(db, et):
    families = []

    for k in db.scan_iter(): #keys('*'):
      if k in et['admins'] or k.startswith('session:') or k.startswith("parameters") or k.startswith("homepage") or k.endswith("hours") or k.endswith("bills") or 'archivedBills' in k:
        continue
      if not ':children:' in k:
        families.append(extract_family_data(db, k))
    
    return families

@app.route("/api/families", methods=["GET"])
def get_families():
    if not session.get('admin'):
      return make_response("", 401)

    db, et = get_db_et(session["etablissement"])
    
    return jsonify(extract_families(db, et))

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
      child_name = child_name.replace("_", " ")
      if ':periods' in k or ':hours' in k:
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
      print username, name, day, day.isoformat(), "%s:children:%s:hours" % (username, name)
      try:
        hours = ast.literal_eval(db.hget("%s:children:%s:hours" % (username, name), day.isoformat()))
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
    
    db.hset("%s:children:%s:hours" % (data["id"], name), day.isoformat(), str(hours))

    return make_response("", 200)

def _get_children_hours(db, username):
    ret = {}

    for k in db.scan_iter(match="%s:children:*:hours" % username):
        _, _, child_name, _ = k.split(":")
        child_name = child_name.replace("_", " ")
        ret[child_name] = db.hgetall(k)
        for day in ret[child_name]:
          hoursString = ret[child_name][day]
          hours = map(float, ast.literal_eval(hoursString))
          ret[child_name][day] = hours
    return ret

@app.route("/api/childrenHours/<username>", methods=["GET"])
def get_children_hours(username):
    if not session.get('admin') and session.get("username") != username:
        return make_response("", 401)
    db, _ = get_db_et(session["etablissement"])
 
    return jsonify(_get_children_hours(db, username))

def _get_children_periods(db, username):
   family = extract_family_data(db, username)
   res = { "rate": { "CAF": family["CAFrate"], "rate": family["rate"] } }
   periods = {}
   res["periods"] = periods
   for child_name, c in family['children'].iteritems():
       if not bool(int(c.get("present", "1"))):
         continue
       key = "%s:children:%s:periods" % (username, child_name.replace(" ", "_")) 
       periods[c["name"]] = map(json.loads, db.lrange(key, 0, -1)) or []
   return res

@app.route("/api/periods/<username>", methods=["GET"])
def get_children_periods(username):
    if session.get('admin') or session.get("username") == username:
        db, _ = get_db_et(session["etablissement"])
        return jsonify(_get_children_periods(db, username))
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
    db, et = get_db_et(session["etablissement"])
    
    content = request.get_json()
    username = content["username"]

    with db.pipeline() as p:
      for x in db.scan_iter(match=username+"*"):
        p.delete(x)
      p.execute()

    return jsonify(extract_families(db, et))

@app.route("/api/delchild", methods=["POST"])
def del_child():
    if not session.get('admin'):
      return make_response("", 401)
    db, _ = get_db_et(session["etablissement"])

    content = request.get_json()
    username = content["username"]
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

@app.route("/api/family/setactive", methods=["POST"])
def activate_family():
    db, _ = get_db_et(session["etablissement"])
    if session.get('admin'):
        content = request.get_json()
        username = content["username"]
        db.hset(username, "active", content["active"])
        return make_response("", 200)
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
def get_bills_data(username):
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

@app.route("/api/file", methods=["POST"])
def upload_file():
  if not session.get("admin"):
     return make_response("", 401)

  if 'file' not in request.files:
     return redirect(request.url)
  file = request.files['file']
  if file.filename == '':
     return redirect(request.url)
  if file and allowed_file(file.filename):
     fileBuf = cStringIO.StringIO()
     file.save(fileBuf)
     hash_md5 = hashlib.md5()
     for chunk in iter(lambda: fileBuf.read(4096), b""):
            hash_md5.update(chunk)
     filename = hash_md5.hexdigest()
     filepath = os.path.join(UPLOAD_FOLDER, filename)
     with open(filepath, "wb") as f:
       f.write(fileBuf.getvalue())
     return jsonify({ "link": filepath })

@app.route(os.path.join(UPLOAD_FOLDER, '<filename>'))
def uploaded_file(filename):
  return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

@app.route("/api/editorContents", methods=["POST"])
def set_editor_contents():
  if not session.get("admin"):
     return make_response("", 401)

  db, _ = get_db_et(session["etablissement"])
 
  content = request.get_json()

  db.set("homepage", content)  

  return make_response("", 200)

@app.route("/api/editorContents", methods=["GET"])
def get_editor_contents():
  db, _ = get_db_et(session["etablissement"])
 
  return jsonify(ast.literal_eval(db.get("homepage")) or {})

@app.route("/api/bills/<username>/submit", methods=["POST"])
def submit_bill(username):
  if not session.get("admin"):
     return make_response("", 401)

  db, _ = get_db_et(session["etablissement"])

  content = request.get_json()
  month = int(content["month"])
  year = int(content["year"])
  data = content["bills"]
  
  key = "%s:archivedBills:%d:%s" % (username, year, month)

  with db.pipeline() as p:
    db.hset(key, "data", data)
    db.hset(key, "paid", "0")
    p.execute()
 
  return make_response("", 200)

@app.route("/api/bills/years", methods=["GET"])
def get_bills_years():
  if not session.get('admin'):
    return make_response("", 401)
  
  db, _ = get_db_et(session["etablissement"])

  ret = list()
  
  for k in db.scan_iter(match="*:archivedBills:*"):
    year = int(k.split(":")[-2])
    if not year in ret:
      ret.append(int(year)) 
  ret.sort()
  return jsonify({ "years": ret })

@app.route("/api/bills/archive/<year>", methods=["GET"])
def get_archived_bills(year):
  if not session.get('admin'):
    return make_response("", 401)
  
  db, _ = get_db_et(session["etablissement"])
  ret = dict()
  families = set()

  for k in db.scan_iter(match="*"):
    if ":children"  in k:
      username = k.split(":")[0]
      families.add(username)

  archived_bills = {}
  for username in families:
    for k in db.scan_iter(match="%s:archivedBills:%s:*" % (username, year)):
       month = k.split(":")[-1]
       data = ast.literal_eval(db.hget(k, "data"))
       d = dict()
       for child_name in data.keys():
         d[child_name] = data[child_name].copy()
         try:
             d[child_name]["amount"] = data[child_name]["bill"]["amount"][child_name]
         except KeyError:
             # several children, no data for one of them
             d[child_name]["amount"] = 0 
         del d[child_name]["bill"]
         d[child_name]["data"] = _get_child_data(db, username, child_name)
       d["__bill__"] = data[child_name]["bill"]["content"]
       archived_bills.setdefault(username, {}).update({ month: d })

  return jsonify(archived_bills)

@app.route("/api/bills/<username>/list", methods=["GET"])
def get_bills_list(username):
  if not session.get('admin') and session.get("username") != username:
    return make_response("", 401)

  db, _ = get_db_et(session["etablissement"])

  keys = "%s:archivedBills:*" % username

  archived_bills = dict()
  for k in db.scan_iter(match=keys):
    try:
       year, month = k.split(":")[-2:]
    except Exception:
      continue
    else:
      year = int(year)
    archived_bills.setdefault(year, {})[month] = db.hgetall(k)
    bill = archived_bills[year][month]
    data = bill.pop("data")
    bill["data"] = ast.literal_eval(data)

  years = archived_bills.keys()
  years.sort()
  ret = list()
  for year in years:
    ret.append({ "year": year, "months": [] })
    for month, bill in archived_bills[year].iteritems():
      ret[-1]["months"].append({ "month": month, "data": bill["data"], "paid": bill["paid"] })

  return jsonify(ret)


if __name__ == '__main__':
  app.run(host="0.0.0.0", port=5000)

