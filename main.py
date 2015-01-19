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
import logging
import datetime
import json
from google.appengine.api import urlfetch
from google.appengine.ext import db

class PushRegistration(db.Model):
  registration = db.StringProperty(required=True)
  endpoint = db.StringProperty(required=True)

def clearRegistrations():
  for r in db.GqlQuery("SELECT * FROM PushRegistration"):
    r.delete()

class ClearRegistrationsHandler(webapp2.RequestHandler):
  def post(self):
    clearRegistrations();
    self.response.write('{ "success": true }');

class PushHandler(webapp2.RequestHandler):
  def post(self):
    logging.info('PushHandler')

    registrations = db.GqlQuery("SELECT * FROM PushRegistration");
    if registrations.count() == 0 :
      self.response.write('{ "success": false, "message": "No registration available to use" }')
      return;

    registrationId = registrations[0].registration;
    endpoint = db.GqlQuery("SELECT * FROM PushRegistration")[0].endpoint;

    logging.info(registrationId)
    logging.info(endpoint)

    form_fields = {
      "registration_id": registrationId,
      "data.data": json.dumps({
        "title": self.request.get('title'),
        "message": self.request.get('message')
      })
    }

    form_data = urllib.urlencode(form_fields)

    result = urlfetch.fetch(url=endpoint,
                            payload=form_data,
                            method=urlfetch.POST,
                            headers={
              'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
              'Authorization': 'key=AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ'
            })
    
    if result.status_code == 200 and not result.content.startswith("Error") :
      self.response.write('{ "success": true, ' +
                          '"registration": "' + registrationId + '" }')
    else:
      logging.info(result.content)
      self.response.write('{ "success": false }')

class PushRegistrationHandler(webapp2.RequestHandler):
  def post(self):
    clearRegistrations();
    
    logging.warning(self.request.get("registration"))
    logging.warning(self.request.get("endpoint"))

    p = PushRegistration(
      registration = self.request.get("registration"),
      endpoint = self.request.get("endpoint"));
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
