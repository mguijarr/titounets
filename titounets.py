from flask import Flask, session, request, jsonify
from flask.ext.session import Session
import redis
import os

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

@app.route("/login", methods=["POST"])
def login():
    content = request.get_json()
    username = content['username']
    password = content['password']

    logged_in = db.hget(username, "password") == password
    session["logged_in"] = logged_in
    if logged_in:
      session["username"] = username
      session["password"] = password

    return jsonify({ 'success': logged_in })



if __name__ == '__main__':
  app.run(host="0.0.0.0", port=5000)

