import { products } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, DollarSign, Users, TrendingUp, Edit, Trash, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background pt-32 pb-24">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-border pb-8">
          <div>
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tighter mb-2">Painel Admin</h1>
            <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest">
              Visão geral do sistema e inventário.
            </p>
          </div>
          <Button className="rounded-none bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs px-6 h-12 flex gap-2">
            <Plus className="h-4 w-4" /> Novo Produto
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          {[
            { title: "Receita Total", value: "R$ 452.318,90", change: "+20.1%", icon: DollarSign },
            { title: "Vendas", value: "+2350", change: "+180.1%", icon: TrendingUp },
            { title: "Produtos", value: products.length.toString(), change: "+2 novos", icon: Package },
            { title: "Clientes", value: "+573", change: "+201h", icon: Users },
          ].map((stat, i) => (
            <div key={i} className="border border-border p-6 hover:border-black transition-colors group bg-card">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{stat.title}</h3>
                <stat.icon className="h-4 w-4 text-muted-foreground group-hover:text-black transition-colors" />
              </div>
              <div className="font-display text-3xl mb-1">{stat.value}</div>
              <p className="font-mono text-[10px] text-muted-foreground">{stat.change} desde o último mês</p>
            </div>
          ))}
        </div>

        {/* Products Table Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-2xl">Inventário</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar produtos..." className="pl-10 rounded-none border-border bg-transparent h-10 font-mono text-xs" />
            </div>
          </div>

          <div className="border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Imagem</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Nome</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Categoria</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Coleção</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12 text-right">Preço</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-secondary/30 border-b border-border transition-colors">
                    <TableCell className="py-4">
                      <div className="h-12 w-12 bg-secondary overflow-hidden">
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover grayscale hover:grayscale-0 transition-all" />
                      </div>
                    </TableCell>
                    <TableCell className="font-display text-base">{product.name}</TableCell>
                    <TableCell className="font-mono text-xs uppercase tracking-widest">{product.category}</TableCell>
                    <TableCell className="font-mono text-xs uppercase tracking-widest">{product.collection}</TableCell>
                    <TableCell className="font-mono text-sm text-right">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-black hover:bg-transparent"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-transparent"><Trash className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
