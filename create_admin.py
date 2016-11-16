import redis
import os
import bcrypt

password = file(os.path.join(os.path.dirname(__file__), "redis.passwd"), "r").read()
db = redis.Redis(host='localhost', port=6379, db=0, password=password.strip())

password = raw_input("admin password ? ")

salt = bcrypt.gensalt()    
passwd_hash = bcrypt.hashpw(password, salt)
   
with db.pipeline() as p:
  p.hset("admin", "password", passwd_hash)
  p.hset("admin", "admin", True) 
  p.execute()
