# Air-Flick #

## Summary ##

A web-based data transfer system in which mobile devices act as controllers between multi-computer, multi-screen systems.

### Technologies ###
* iOS and Android devices
  * native code development
* Nodejs
* Backbonejs
* Underscorejs
* --templating language--

### Goal ###
TBD

## Ideas ##
* pinwheel screen assignment and data transfer

## Timeline ##
#### March 21, 2014 ####
  1. Controller application detects events and transmits corresponding response to server
  2. Server responds to data from the application client
    * Only a single instance; displays event detected by the controller
  3. Number of computer screens: 1
  
#### April 4, 2014 ####
  1. Based on the swipe direction used within the controller app the appropriate screen will register the data transfer
    * i.e. a swipe left will transmit data to server and the server displays the data on the left most screen;
      swipe upwards corresponds to the center screen; swipe right corresponds to the right most screen
  2. Server can run _multiple_ instances 
  3. Number of computer screens: 2+
  4. 
  
#### April 11, 2014 ####
  1. Multiple controllers
  
