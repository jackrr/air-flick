var dust = require('../dust-core.min.js');
(function(){dust.register("display",body_0);function body_0(chk,ctx){return chk.write("<div class=\"infoBar\"></div><div class=\"waveArea\"><div id=\"plain\"></div><div id=\"pitch\"></div><div id=\"vol\"></div><div id=\"chord\"></div></div><div class=\"queues\"><div id=\"volume_queue\"></div><div id=\"pitch_queue\"></div><div id=\"chord_queue\"></div></div>");}return body_0;})();