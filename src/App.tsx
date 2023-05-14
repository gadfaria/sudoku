import {
  Accessor,
  For,
  Setter,
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
} from "solid-js";
import styles from "./App.module.css";
import { Logo } from "./assets/logo";

type Difficulty = "easy" | "medium" | "hard" | "expert" | "evil";
interface Sudoku {
  index: number;
  value: Accessor<string>;
  setValue: Setter<string>;
  notes: Accessor<string[]>;
  setNotes: Setter<string[]>;
  fixed: boolean;
  neighborIndexes: number[];
}

interface Original {
  mission: string;
  solution: string;
  win_rate: number;
}

const DIFFICULTY: Difficulty[] = ["easy", "medium", "hard", "expert", "evil"];

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

async function fetchSudoku(difficulty: Difficulty = "hard") {
  const response = await fetch(`${SERVER_URL}/${difficulty}`, {
    headers: {
      "x-requested-with": "XMLHttpRequest",
    },
  });

  const data: Original = await response.json();
  return data;
}

function App() {
  const [sudoku, setSudoku] = createSignal<Sudoku[]>([]);

  const [selected, setSelected] = createSignal(-1);
  const [notesMode, setNotesMode] = createSignal(false);

  const [difficulty, setDifficulty] = createSignal("medium" as Difficulty);

  const [original, { refetch }] = createResource(difficulty, fetchSudoku);

  createEffect(() => {
    const data = original();
    if (!data) return;

    setSudoku(() =>
      data.mission.split("").map((d, index) => {
        const [value, setValue] = createSignal(d === "0" ? "" : d);
        const [notes, setNotes] = createSignal<string[]>([]);

        const columnIndexes = new Array(9).fill(0).map((_, i) => {
          return i * 9 + (index % 9);
        });

        const rowIndexes = new Array(9).fill(0).map((_, i) => {
          return Math.floor(index / 9) * 9 + i;
        });

        const boxIndexes = new Array(9).fill(0).map((_, i) => {
          const boxIndex = Math.floor(index / 27) * 27 + (index % 9);
          return boxIndex + Math.floor(i / 3) * 9 + (i % 3) - (index % 3);
        });

        const neighborIndexes = Array.from(
          new Set([...columnIndexes, ...rowIndexes, ...boxIndexes])
        );

        return {
          index,
          value,
          setValue,
          notes,
          setNotes,
          fixed: d !== "0",
          neighborIndexes,
        };
      })
    );
  });

  async function handleDifficultyClick(d: Difficulty) {
    if (d === difficulty()) refetch();
    else setDifficulty(d);
  }

  createEffect(() => {
    const index = selected();

    function handleKeypress(evt: KeyboardEvent) {
      const pressedKey = evt.key;

      if (pressedKey === "/") {
        setNotesMode((prev) => !prev);
        return;
      }

      if (index === -1) return;

      if (pressedKey === "Backspace") {
        sudoku()[index].setValue("");
        sudoku()[index].setNotes([]);
        return;
      }

      const number = Number(pressedKey);
      if (isNaN(number)) return;

      if (notesMode()) {
        if (number === 0) {
          sudoku()[index].setNotes([]);
          return;
        }
        const notes = sudoku()[index].notes();
        if (notes.includes(pressedKey)) {
          sudoku()[index].setNotes(notes.filter((n) => n !== pressedKey));
        } else {
          sudoku()[index].setNotes([...notes, pressedKey]);
        }
        sudoku()[index].setValue("");
        return;
      }

      if (number === 0) sudoku()[index].setValue("");
      else sudoku()[index].setValue(pressedKey);

      sudoku()[index].setNotes([]);
      setSelected(-1);

      const isFinished = sudoku().every((cell) => cell.value() !== "");
      if (isFinished) check();
    }
    document.addEventListener("keypress", handleKeypress);

    onCleanup(() => {
      document.removeEventListener("keypress", handleKeypress);
    });
  }, [selected(), notesMode()]);

  function handleCellClick(index: number) {
    if (sudoku()[index].fixed) return;
    setSelected(index);
  }

  function check() {
    const sequence = sudoku()
      .map((cell) => cell.value())
      .join("");

    if (sequence === original()?.solution) {
      alert("You win!");
    } else {
      alert("Try again!");
    }
  }

  const Sudoku = createMemo(() => {
    const selectedIndex = selected();

    return (
      <div class={styles.grid}>
        <For each={sudoku()}>
          {(cell) => {
            let componentStyles = `${styles.cell}`;
            const isSelected = selectedIndex === cell.index;
            const isFixed = cell.fixed;
            const isNeighbor = cell.neighborIndexes.includes(selectedIndex);

            if (isSelected) componentStyles += ` ${styles.selected}`;
            if (isFixed) componentStyles += ` ${styles.fixed}`;
            else componentStyles += ` ${styles.mutable}`;

            if (isNeighbor && !isSelected)
              componentStyles += ` ${styles.neighbor}`;

            return (
              <div
                class={`${componentStyles}`}
                onClick={() => handleCellClick(cell.index)}
              >
                <div class={`${styles.note}`}>
                  <For each={cell.notes()}>{(note) => <div>{note}</div>}</For>
                </div>
                {cell.value()}
              </div>
            );
          }}
        </For>
      </div>
    );
  });

  return (
    <div class={styles.container} onClick={() => setSelected(-1)}>
      <Logo />

      <div
        class={`${styles.notesButton} ${
          notesMode() && styles.notesButtonActive
        }`}
        onClick={() => setNotesMode((prev) => !prev)}
      >
        {notesMode() ? "notes" : "numbers"}
      </div>

      <div class={styles.buttons}>
        {DIFFICULTY.map((d) => (
          <div
            class={`${styles.button} ${
              d === difficulty() && styles.selectedButton
            }`}
            onClick={() => handleDifficultyClick(d)}
          >
            {d}
          </div>
        ))}
      </div>

      <Show when={!original.loading} fallback={<div class={styles.loading} />}>
        {Sudoku()}
      </Show>
    </div>
  );
}

export default App;
