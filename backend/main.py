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

class SendPushHandler(webapp2.RequestHandler):
  def post(self):
    logging.info('SendPushHandler')

    subscriptionId = self.request.get("subscriptionId")
    endpoint = self.request.get("endpoint")

    logging.info(subscriptionId)
    logging.info(endpoint)

    form_fields = {
      "registration_id": subscriptionId
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

app = webapp2.WSGIApplication([
  ('/send_push', SendPushHandler)
], debug=True)