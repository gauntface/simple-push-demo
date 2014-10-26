#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import webapp2
import urllib
import datetime
from google.appengine.api import urlfetch
from google.appengine.ext import db

class PushRegistration(db.Model):
  registration = db.StringProperty(required=True)

def clearRegistrations():
  for r in db.GqlQuery("SELECT * FROM PushRegistration"):
    r.delete()

class ClearRegistrationsHandler(webapp2.RequestHandler):
  def post(self):
    clearRegistrations();
    self.response.write('{ "success": true }');

class PushHandler(webapp2.RequestHandler):
  def post(self):
    url = "https://android.googleapis.com/gcm/send"
    reg = self.request.get("registration")
    msg = self.request.get("message")

    registrations = db.GqlQuery("SELECT * FROM PushRegistration")
    for r in registrations:
      if r.registration == reg:
        continue

      form_fields = {
        "registration_id": r.registration,
        "data.data": msg
      }
      form_data = urllib.urlencode(form_fields)
      result = urlfetch.fetch(url=url,
                              payload=form_data,
                              method=urlfetch.POST,
                              headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'key=AIzaSyBKVu-Aan8MeyJspfd-h_jR5f-IsWVB6Qc'
              })

    self.response.write('{ "success": true }')

class PushRegistrationHandler(webapp2.RequestHandler):
  def post(self):
    clearRegistrations();

    p = PushRegistration(registration = self.request.get("registration"));
    p.put()

    self.response.write('{ "success": true }')

class GetRegistrationsHandler(webapp2.RequestHandler):
  def post(self):
    response = ""
    for r in db.GqlQuery("SELECT * FROM PushRegistration"):
      response += r.registration + ", "
    self.response.write('{ "response": "' + response + '" }');

app = webapp2.WSGIApplication([
  ('/push', PushHandler),
  ('/register_track', PushRegistrationHandler),
  ('/clear_registrations', ClearRegistrationsHandler),
  ('/get_registrations', GetRegistrationsHandler)
], debug=True)
