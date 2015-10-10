window.URL = window.URL || window.webkitURL;
navigator.getUserMedia = navigator.getUserMedia ||
navigator.webkitGetUserMedia ||
navigator.mozGetUserMedia ||
navigator.msGetUserMedia;

fakeBlobURL = new ReactiveVar(null); 

SoundRecorder  = function(){
  this.recording = false; 
  this.currentData = []; 
}

SoundRecorder._bufferSize = 2048; 

_.extend(SoundRecorder.prototype,{
  startRecording : function(){
    var self = this; 
    self.recording = true; 
    var audioContext = window.AudioContext || 
    window.webkitAudioContext || 
    window.mozAudioContext;
    var context = new audioContext();
    SoundRecorder.sampleRate = context.sampleRate;
    navigator.getUserMedia({audio : true, video : false}, function (stream) {
      var streamSource = context.createMediaStreamSource(stream);
      var recorder = context.createScriptProcessor(SoundRecorder._bufferSize, 1, 1);
      recorder.onaudioprocess = function(e){
        if(!self.recording) return ; 
        var data = e.inputBuffer.getChannelData(0);
        self.currentData.push(data);
      }
      streamSource.connect(recorder);
      recorder.connect(context.destination);
    },function(){
      console.log("no access to mickrophone"); 
    });
  }, 
  stopRecording : function(){
    this.recording = false ; 
    this.currentData = []; 
    parseToWAV(this.currentData); 
  }
}); 



var flatBuffers = function(arrayOfBuffers){
  var result = new Float32Array(arrayOfBuffers.length*SoundRecorder._bufferSize);
  var offset = 0;
  var lng = arrayOfBuffers.length;
  for (var i = 0; i < lng; i++){
    var buffer = arrayOfBuffers[i];
    result.set(buffer, offset);
    offset += buffer.length;
  }
  return result;
}


function writeUTFBytes(view, offset, string){ 
  var lng = string.length;
  for (var i = 0; i < lng; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function parseToWAV(Float32Array){
  var flatten = flatBuffers(Float32Array); 
   
  var buffer = new ArrayBuffer(44 + flatten.length * 2);
  var view = new DataView(buffer);

  writeUTFBytes(view, 0, 'RIFF');
  view.setUint32(4, 44 + buffer.length * 2, true);
  writeUTFBytes(view, 8, 'WAVE');
  writeUTFBytes(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, SoundRecorder.sampleRate, true);
  view.setUint32(28, SoundRecorder.sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeUTFBytes(view, 36, 'data');
  view.setUint32(40, flatten.length * 2, true);
   
  // write the PCM samples
  var lng = flatten.length;
  var index = 44;
  var volume = 1;
  for (var i = 0; i < lng; i++){
      view.setInt16(index, flatten[i] * (0x7FFF * volume), true);
      index += 2;
  }
   
  var blob = new Blob ( [ view ], { type : 'audio/wav' } );
  var blobURL = window.URL.createObjectURL(blob); 
  fakeBlobURL.set(blobUrl); 
}

Template.sandboxRecorder.helpers({
  'blobUrl' : function(){
    return fakeBlobURL.get(); 
  }
}); 