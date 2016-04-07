DATA= 'diags={"dpe":true,"dta":false,"crep":false,"loiCarrez":true,"ernt":true,"termites":false,"gaz":false,"electricity":false,"parasitaire":false}&sell=true&house=true&squareMeters="-40m2"&constructionPermissionDate="avant le 01/01/1949"&address="15 Boulevard Voltaire, 75011 Paris, Francia"&gasInstallation="Oui, Moins de 15 ans"&date="2016-02-12T11:11:28.820Z"&price=70&time="1:5"&diagFrom=1455273688306&_diag=1&diagTo=1455277288306&email="client@sad.com"'

curl --data "$DATA" http://localhost:5000/order/saveWithEmail



