import { useEffect, ReactNode } from 'react';
import Vex from 'vexflow';
import { getKeyAccidental } from '../game/scales';

export interface StaveNoteDisplayProps {
  note: string;
  keySignature: string;
}

export default function StaveNoteDisplay({ note, keySignature }: StaveNoteDisplayProps): ReactNode {
  const containerId = `stave-${note}-${keySignature}`;

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    try {
      const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = Vex.Flow;

      // Create SVG renderer
      const renderer = new Renderer(container as HTMLDivElement, Renderer.Backends.SVG);
      renderer.resize(150, 150);
      const context = renderer.getContext();
      context.setFont('Arial', 10);

      // Set colors to white
      context.setStrokeStyle('white');
      context.setFillStyle('white');

      // Create stave
      const stave = new Stave(10, 10, 120);
      stave.addClef('treble').addKeySignature(keySignature);
      stave.setContext(context).draw();

      // Create the note - parse note string (e.g., "B3" -> "B/3", "Bb3" -> "Bb/3")
      const noteParts = note.match(/([A-G])([#b]?)(\d)/);
      if (!noteParts) return;

      const noteLetter = noteParts[1];
      const accidental = noteParts[2];
      const octave = noteParts[3];
      const noteString = `${noteLetter}${accidental}/${octave}`;

      // Create note object (half note)
      // Determine stem direction: notes above B4 should have stem down
      const octaveNum = parseInt(octave, 10);
      const shouldStemDown = octaveNum >= 5;
      const noteObj = new StaveNote({
        keys: [noteString],
        duration: 'h',
        stem_direction: shouldStemDown ? -1 : 1,
      });

      // Determine if we need to show an accidental (including naturals against key signature)
      const keySigAcc = getKeyAccidental(keySignature, noteLetter);
      const noteAcc: '#' | 'b' | null = accidental === '#' ? '#' : accidental === 'b' ? 'b' : null;
      let renderAcc: string | null = null;

      if (noteAcc !== keySigAcc) {
        if (noteAcc === null && keySigAcc) {
          renderAcc = 'n'; // natural to cancel key signature accidental
        } else if (noteAcc) {
          renderAcc = noteAcc; // sharp or flat explicit
        }
      }

      if (renderAcc) {
        noteObj.addModifier(new Accidental(renderAcc));
      }

      // Set note color to white
      noteObj.setStyle({ fillStyle: 'white', strokeStyle: 'white' });
      noteObj.setLedgerLineStyle({ strokeStyle: '#d1d5db' }); // Pale grey for ledger lines

      // Format and draw
      const voice = new Voice({ num_beats: 2, beat_value: 4 });
      voice.addTickables([noteObj]);

      new Formatter()
        .joinVoices([voice])
        .format([voice], 120);

      voice.draw(context, stave);
    } catch (error) {
      console.error('Error rendering stave:', error);
    }
  }, [note, keySignature, containerId]);

  return (
    <div
      id={containerId}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 150,
        minHeight: 150,
      }}
    />
  );
}
