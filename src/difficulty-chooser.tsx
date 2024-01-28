import {
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
} from "@mui/material";

interface DifficultyChooserProps {
  open: boolean;
  onClose: () => void;
  difficulty: string;
  setDifficulty: (level: string) => void;
}

const DifficultyChooser: React.FC<DifficultyChooserProps> = ({
  open,
  onClose,
  difficulty,
  setDifficulty,
}) => {
  const difficulties = ["Easy", "Medium", "Hard"];
  const difficultyColorMap: any = {
    Easy: "secondary",
    Medium: "warning",
    Hard: "error",
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="flex justify-center">
        <DialogContentText>Choose difficulty</DialogContentText>
      </DialogContent>
      <DialogActions>
        <ButtonGroup
          variant="contained"
          aria-label="outlined primary button group"
        >
          {difficulties.map((level) => (
            <Button
              key={level}
              color={difficultyColorMap[level]}
              onClick={() => setDifficulty(level)}
            >
              {level}
            </Button>
          ))}
        </ButtonGroup>
      </DialogActions>
    </Dialog>
  );
};

export default DifficultyChooser;
