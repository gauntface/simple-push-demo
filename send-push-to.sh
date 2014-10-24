#!/bin/sh

APP_KEY="AIzaSyBYu0LnUCsurx72pU03tT5_DRV_oslWyuo"
REGISTRATION_ID=$1

curl -H "Content-Type:application/x-www-form-urlencoded;charset=UTF-8" \
     -H "Authorization: key=${APP_KEY}" \
     -d "registration_id=${REGISTRATION_ID}" \
     -d data.data=pushmessage \
     https://android.googleapis.com/gcm/send

echo ""
