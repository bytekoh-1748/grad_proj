"""Original, deterministic PCM sound sketches for the ROOM demo (no external recordings)."""
import math, wave, array, random
from pathlib import Path
RATE=22050
TRACKS=[('midnight-rotation',92,[45,52,55,59]),('eye-of-the-needle',116,[50,57,60,64]),('twin-profile',88,[48,55,58,62]),('sun-machine',108,[53,60,64,67]),('cut-and-paste',128,[40,47,50,55]),('slow-bloom',72,[48,55,62,67])]
for index,(name,bpm,chord) in enumerate(TRACKS):
    rng=random.Random(index+420);beat=60/bpm;duration=beat*32;count=int(RATE*duration);samples=array.array('h')
    for i in range(count):
        t=i/RATE;step=int(t/beat);phase=t%beat;envelope=math.exp(-phase*5)
        note=chord[(step//2)%len(chord)]+12;freq=440*2**((note-69)/12)
        keys=(math.sin(2*math.pi*freq*t)+.28*math.sin(2*math.pi*freq*2*t))*.12*envelope
        bassfreq=440*2**((chord[(step//8)%len(chord)]-12-69)/12)
        bass=math.sin(2*math.pi*bassfreq*t)*.14*(1-math.exp(-phase*35))*math.exp(-phase*2)
        kick=math.sin(2*math.pi*(48*phase+35*(1-math.exp(-phase*25))/25))*math.exp(-phase*20)*.18 if step%2==0 else 0
        hat=(rng.random()*2-1)*math.exp(-(t%(beat/2))*90)*.024
        pad=sum(math.sin(2*math.pi*440*2**((n-69)/12)*t) for n in chord)*.015
        fade=min(1,t/.04,(duration-t)/.07);signal=(keys+bass+kick+hat+pad)*fade
        samples.append(int(max(-1,min(1,signal))*26000))
    path=Path('public/audio')/(name+'.wav')
    with wave.open(str(path),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(samples.tobytes())
    print(name,round(duration,2),'seconds')
