import { BoardProvider } from '@/contexts/BoardContext';
import Board from '@/components/Board';

export default function Home() {
  return (
    <BoardProvider>
      <Board />
    </BoardProvider>
  );
}
