import { Puzzle } from "./types";

const fetchFromSudokuApi = () => {
    interface Result {
        newboard: {
            grids: Puzzle[]
        }
    }
    return fetch("https://sudoku-api.vercel.app/api/dosuku")
        .then((response) => response.json())
        .then((data: Result) => {
            console.log(data.newboard.grids[0]);
            return data.newboard.grids[0]
        })
        .catch((error) => {
            console.error("Error fetching Sudoku data:", error);
            return null;
        });
}

type Strategy =
    "sudokuApi" |
    "generate";

export const fetchOne = (strategy: Strategy) => {
    return fetchFromSudokuApi();
}