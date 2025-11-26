import { useEffect, useState } from 'react';
import api from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Boxes, Menu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

interface Estoque {
  id: number;
  nome: string;
}

interface EstoqueItem {
  id: number;
  quantidade: number;
  item: {
    nome: string;
  };
}

export default function ListarEstoque() {
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<EstoqueItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [estoqueSelecionado, setEstoqueSelecionado] = useState<Estoque | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function carregarEstoques() {
      try {
        const resposta = await api.get('/stock/visualizar');
        setEstoques(resposta.data);
      } catch (err) {
        console.error(err);
        setErro('Erro ao carregar estoques');
      } finally {
        setLoading(false);
      }
    }

    carregarEstoques();
  }, []);

  const handleOpenModal = async (estoque: Estoque) => {
    setEstoqueSelecionado(estoque);
    try {
      const response = await api.get(`/stock/visualizar/${estoque.id}/itens`);
      setItens(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Erro ao buscar itens do estoque:', error);
    }
  };

  const handleAdicionarItem = (estoque: Estoque) => {
    router.push(`/transfer/create-estoque-item/${estoque.id}`);
  };

  if (erro) {
    return (
      <div className="flex items-center gap-2 text-red-500 mt-4">
        <AlertCircle className="w-4 h-4" />
        <span>{erro}</span>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Boxes className="w-5 h-5 text-blue-500" />
        Estoques cadastrados
        <Badge variant="outline" className="ml-2">{estoques.length}</Badge>
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {estoques.map((estoque) => (
            <Card key={estoque.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4 flex justify-between items-center">
                <p className="text-base font-medium">{estoque.nome}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Menu className="w-5 h-5 text-zinc-500 cursor-pointer" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleOpenModal(estoque)}>
                      Ver itens
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAdicionarItem(estoque)}>
                      Adicionar item
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Itens do estoque: <span className="text-blue-600">{estoqueSelecionado?.nome}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            {itens.length > 0 ? (
              itens.map((item) => (
                <div key={item.id} className="flex justify-between border-b py-1 text-sm">
                  <span>{item.item.nome}</span>
                  <span className="text-muted-foreground">Qtd: {item.quantidade}</span>
                </div>
              ))
            ) : (
              <p className="text-sm italic text-muted-foreground">Nenhum item neste estoque.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
