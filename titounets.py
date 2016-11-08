from flask import Flask, redirect, url_for
import os

app = Flask("titounets", static_url_path='', static_folder='')

@app.route("/")
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
  app.run(host="0.0.0.0", port=5000)

