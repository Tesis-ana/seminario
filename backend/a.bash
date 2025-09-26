TOKEN=$(curl -s -X POST {{url}}/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"rut":"111111111","password":"Clave123"}' | jq -r '.token')

curl -X GET "{{url}}/pacientes/search?q=ana&limit=10" \
  -H "Set-Cookie: {{cookie}}"


curl -X POST {{url}}/pacientes \
  -H "Set-Cookie: {{cookie}}" \
  -H 'Content-Type: application/json' \
  -d '{"user_id":123,"tipo_sangre":"O+","altura":165,"edad":74}'

curl -X PUT {{url}}/pacientes/123 \
  -H "Set-Cookie: {{cookie}}" \
  -H 'Content-Type: application/json' \
  -d '{"altura":167,"edad":75}'

curl -X GET {{url}}/pacientes/123 \
  -H "Set-Cookie: {{cookie}}"

curl -X GET {{url}}/pacientes/3/datos    -H "Set-Cookie: {{cookie}}"
curl -X GET http://a/pacientes/3/detalles -H "Set-Cookie: {{cookie}}"
curl -X GET http://a/pacientes/3/resumen  -H "Set-Cookie: {{cookie}}"

curl -X DELETE http://a/pacientes/3 \
  -H "Set-Cookie: {{cookie}}"
