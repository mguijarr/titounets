import redis
import sys
import os
import bcrypt

password = file(os.path.join(os.path.dirname(__file__), "redis.passwd"), "r").read()
db_id=int(sys.argv[1])
name = sys.argv[2]

db = redis.Redis(host='localhost', port=6379, db=db_id, password=password.strip())
password = raw_input("admin password ? ")
salt = bcrypt.gensalt()    
passwd_hash = bcrypt.hashpw(password, salt)
   
with db.pipeline() as p:
  p.hset(name, "password", passwd_hash)
  p.hset(name, "admin", True) 

  p.execute()
