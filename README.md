# streamblocks_2021

## 1 - server sur mac

* install :
  * git clone https://github.com/lesitevideo/streamblocks_2021/
  * cd streamblocks_2021
  * npm install


* usage : node server.js

## 2 - client sur raspberry

* install :
  * git clone https://github.com/lesitevideo/streamblocks_2021/
  * cd streamblocks_2021
  * npm install
  * configurer variables dans client.js :
    * ip serveur web => const macpro_ip = 'http://192.168.2.22:1664';
    * ID du block => const BLOCK_ID = 23;

* usage : node client.js | aplay -f S16_LE  -c1 -r 44100 -B 100000


# TODO
## client
 * délai sur client & underrun!!! (at least 0.036 ms long)
 * autostart on boot avec PM2
 * faire socket.emit status si le block plante
 
## server
 * SSL générer .cert et .pem
 * vérifier le tableau des présents sur la socket
 * prévoir le cas ou un block plante
 * faire un json 'scene status' avec les états de tous les blocks et leurs infos
 * sur l'interface web prévoir une case à cocher pour broadcaster à tous ou emit à un seul
 * sur l'interface web pouvoir choisir les channels des input sources
