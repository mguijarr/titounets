from flask import Flask, session, request, jsonify, make_response
#from flask_session import Session
import redis
import os
import caf
import bcrypt

password = file(os.path.join(os.path.dirname(__file__), "redis.passwd"), "r").read()
db = redis.Redis(host='localhost', port=6379, db=0, password=password.strip())

app = Flask("titounets", static_url_path='', static_folder='')
#SESSION_TYPE = 'redis'
#SESSION_REDIS = db
#app.config.from_object(__name__)
#Session(app)

@app.route("/")
def index():
    return app.send_static_file('index.html')

@app.route("/login", methods=["POST"])
def login():
    content = request.get_json()
    username = str(content['username'])
    password = str(content['password'])

    passwd_hash = db.hget(username, "password")
    logged_in = passwd_hash == bcrypt.hashpw(password, passwd_hash)

    return jsonify({ 'success': logged_in, "admin": db.hget(username, "admin") == 'True', "id": username })

@app.route('/families', methods=["GET"])
def get_families():
    pass

@app.route('/family/<int:username>', methods=["GET"])
def get_family(username):
    family = db.hgetall(username)

    for k in db.keys("%s:children:*" % username):
        family.setdefault("children", []).append(db.hgetall(k))

    family.pop("password")
    family['address'] = { "street": [family.pop("address1"), family.pop("address2")],
                          "city": family.pop("city"),
                          "zip": family.pop("zip") }
                          
    return jsonify(family)

@app.route("/save", methods=["POST"])
def save():
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
  content = request.get_json()
  caf_id = content['id']

  result = caf.get_data(caf_id)

  return jsonify(result)

@app.route("/calendar", methods=["GET"])
def get_calendar():
  pass


if __name__ == '__main__':
  app.run(host="0.0.0.0", port=5000)

