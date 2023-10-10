import { Midi, Track } from '@tonejs/midi';
import * as Tone from 'tone';

class MidiRecorder {
    private midi: Midi;
    private track: Track;
    private startTime: number;

    constructor() {
        this.midi = new Midi();
        this.track = this.midi.addTrack();
        this.startTime = 0;
    }

    startRecording() {
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then(
                (midiAccess) => {
                    const inputs = Array.from(midiAccess.inputs.values());

                    if (inputs.length === 0) {
                        console.warn('No MIDI inputs found.');
                        return;
                    }

                    inputs[0].onmidimessage = (event) => this.onMIDIMessage(event);

                    this.startTime = Tone.now();
                },
                (error) => {
                    console.error('Could not access MIDI devices.', error);
                }
            );
        } else {
            console.warn('WebMIDI is not supported in this browser.');
        }
    }

    stopRecording() {
        // TODO: Save the MIDI file or process as needed.
        // For now, let's just log it:
        console.log(this.midi);
    }

    private onMIDIMessage(event) {
        if (event.data[0] === 144 || (event.data[0] === 128 && event.data[2] !== 0)) {
            const time = Tone.now() - this.startTime; // Relative time since recording started

            this.track.addNote({
                midi: event.data[1],
                time: time,
                duration: 0.5 // This should ideally be dynamically determined based on when the note ends
            });
        }
    }
}

// Example usage:
const recorder = new MidiRecorder();
recorder.startRecording();


    /*
    async saveRecordToFile() {
        console.log("SAVING RECORD")
        const jsonData = JSON.stringify(this.record);

        // Create a blob from the JSON string
        const blob = new Blob([jsonData], { type: 'application/json' });

        // Create a link element to facilitate the download
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = 'midi-record.json';
        a.click();
        URL.revokeObjectURL(url); // Free up memory from the object URL
    }
    */

    async saveRecordToFile() {
    console.log("SAVING RECORD");
    const jsonData = JSON.stringify(this.record);

    // Download as JSON
    this.downloadBlob(new Blob([jsonData], { type: 'application/json' }), 'midi-record.json');

    // Convert this.record to a MIDI file
    const midi = new Midi();
    const track = midi.addTrack();
    let previousTimestamp = 0;

    for (let record of this.record) {
        const deltaTime = record.timestamp - previousTimestamp; // The difference in time between the previous note and the current note
        track.addNote({
            midi: record.note,
            time: record.timestamp / 1000, // Convert timestamp from milliseconds to seconds
            duration: 0.5 // You might want to determine this dynamically based on your data
        });
        previousTimestamp = record.timestamp;
    }

    // Convert Midi object to Uint8Array and then download it as a .midi file
    this.downloadBlob(new Blob([midi.toArray()], { type: 'audio/midi' }), 'midi-record.midi');
}

downloadBlob(blob: Blob, filename: string) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url); // Free up memory from the object URL
}