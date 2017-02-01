import redis
import os
import bcrypt
import ast
import uuid
import json

password = file(os.path.join(os.path.dirname(__file__), "redis.passwd"), "r").read()

ets_dict = dict()
ets = file(os.path.join(os.path.dirname(__file__), "etablissements.cfg"), "r").read()
ets_dict.update(ast.literal_eval(ets))

last_id = 0
for et in ets_dict.itervalues():
  last_id = max(et["id"], last_id)
new_id = last_id + 1

name = raw_input("name ? ")
caf_username = raw_input("CAF username ? ")
caf_passwd = raw_input("CAF password ? ")
key = str(uuid.uuid4())

ets_dict[key] = { "name": name, "caf": (caf_username, caf_passwd), "id": new_id }

with file(os.path.join(os.path.dirname(__file__), "etablissements.cfg"), "w") as f:
  f.write(json.dumps(ets_dict, ensure_ascii=False))

db = redis.Redis(host='localhost', port=6379, db=new_id, password=password.strip())
password = raw_input("admin password ? ")
salt = bcrypt.gensalt()    
passwd_hash = bcrypt.hashpw(password, salt)
   
with db.pipeline() as p:
  p.hset("admin", "password", passwd_hash)
  p.hset("admin", "admin", True) 
  p.hset("parameters", "name", name)
  p.hset("parameters", "address", "{u'city': u'', u'street': [u'', u''], u'zip': u''}")

  p.execute()


