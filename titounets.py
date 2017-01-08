from flask import Flask, session, request, jsonify, make_response
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
SESSION_TYPE = 'redis'
SESSION_REDIS = db
app.config.from_object(__name__)
Session(app)

@app.route("/")
def index():
    return app.send_static_file('index.html')

@app.route('/holidays')
def holidays():
    print get_holidays()
    return jsonify(get_holidays())

@app.route("/login", methods=["POST"])
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

@app.route("/logout", methods=["POST"])
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

@app.route('/families', methods=["GET"])
def get_families():
    if not session['admin']:
      return make_response("", 401)   
    
    return jsonify(extract_families())

@app.route('/children/<date>', methods=["GET"])
def get_children(date):
    if not session['admin']:
      return make_response("", 401)   
    
    period_keys = db.keys("*:children:*:periods")
    result = list()
    day = dateutil.parser.parse(date).date()
    local_tz = pytz.timezone("Europe/Paris")

    for p in period_keys:
      json_date_ranges = map(json.loads, db.lrange(p, 0, -1))
      date_ranges = [(dateutil.parser.parse(r["start"]), dateutil.parser.parse(r["end"])) for r in json_date_ranges] 
  
      for start, end in date_ranges:
        start = start.replace(tzinfo=pytz.utc).astimezone(local_tz).replace(tzinfo=None)
        end = end.replace(tzinfo=pytz.utc).astimezone(local_tz).replace(tzinfo=None)
        print start.time(), end.time()
        if start.date() <= day <= end.date():
          username,_,child_index,_ = p.split(":")
          family_data = extract_family_data(username)
          child = family_data["children"][int(child_index)]
          start_time = start.time().hour+start.time().minute/60.
          end_time = end.time().hour+end.time().minute/60.
          result.append((child['surname'], child['name'], username, start_time, end_time))

    result.sort()

    children = []
    for child in result:
      children.append({ "surname": child[0], "name": child[1], "id": child[2], "contractStart":child[3], "contractEnd": child[4] })
    
    return jsonify(children)   

@app.route("/periods/<int:username>", methods=["GET"])
def get_children_periods(username):
    if session['admin'] or int(session["username"]) == username:
        family = extract_family_data(username)
        res = list()
        for i, c in enumerate(family['children']):
           key = "%d:children:%s:periods" % (username, i) #c["name"])
           res.append({ "name": c["name"], "periods": map(json.loads, db.lrange(key, 0, -1)) or [] })

        return jsonify(res)
    else:
        return make_response("", 401)

@app.route("/periods/<int:username>", methods=["POST"])
def set_children_periods(username):
    if session['admin'] or int(session["username"]) == username:
        periods = request.get_json()
        family_data = extract_family_data(username)
        for p in periods:
           i = [p["name"]==c["name"] for c in family_data["children"]].index(True)
           key = "%d:children:%s:periods" % (username, i)
           plist = map(json.dumps, p["periods"])
           with db.pipeline() as P:
               P.delete(key)
               if plist:
                   P.rpush(key, *plist)
               P.execute()

        return make_response("", 200) 
    else:
        return make_response("", 401)
   
@app.route('/delfamily', methods=["POST"])
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

@app.route('/family/<int:username>', methods=["GET"])
def get_family(username):
    if session['admin'] or int(session["username"]) == username:
        return jsonify(extract_family_data(username))
    else:
        return make_response("", 401)

@app.route("/save", methods=["POST"])
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

@app.route("/caf", methods=["POST"])
def retrieve_caf_data():
  """{'address': {'city': u'ST LAURENT DU PONT', 'street': [u'1579 CHEMIN DES COTES DE VILLETTE', u''], 'zip': u'38380'}, 'parents': [u'SAMIRA ACAJJAOUI', u'MATHIAS GUIJARRO'], 'children': [{'surname': u'GUIJARRO', 'name': u'ELIAS', 'birthdate': '2013-06-15T00:00:00'}, {'surname': u'GUIJARRO', 'name': u'SARA', 'birthdate': '2011-09-06T00:00:00'}], 'qf': 77785.0}
  """
  if not session["admin"]:
    return make_response("", 401)

  content = request.get_json()
  caf_id = content['id']

  result = caf.get_data(caf_id)

  return jsonify(result)

@app.route("/parameters", methods=["GET"])
def get_parameters():
  params = db.hgetall("parameters")
  params['address'] = ast.literal_eval(params.pop("address", {}))
  return jsonify(params)

@app.route("/saveParameters", methods=["POST"])
def save_parameters():
  if not session["admin"]:
    return make_response("", 401)

  content = request.get_json()

  for key, val in content.iteritems():
    db.hset("parameters", key, val)

  return make_response("", 200)

@app.route("/allowContractChanges", methods=["POST"])
def allow_contract_changes():
    if not session["admin"]:
        return make_response("", 401)

    content = request.get_json()

    db.hset("parameters", "contractChangesAllowed", "1" if content["allowChanges"] else "0")

    return make_response("", 200)

@app.route("/opening_hours", methods=["GET"])
def opening_hours():
  return jsonify([db.hget("parameters", "opening"), db.hget("parameters", "closing")])

@app.route("/calendar", methods=["GET"])
def get_calendar():
  pass


if __name__ == '__main__':
  app.run(host="0.0.0.0", port=5000)

