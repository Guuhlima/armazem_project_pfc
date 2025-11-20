"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function ContagemModal({
    open,
    onClose,
    quantidade,
    onIrParaContagem,
}: {
    open: boolean;
    onClose: () => void;
    quantidade: number;
    onIrParaContagem: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <AlertTriangle className="w-5 h-5 text-yellow-600">
                            Contagens Ciclicas Pendentes
                        </AlertTriangle>
                    </DialogTitle>
                </DialogHeader>

                <div className="text-sm text-muted-foreground">
                    Voce possui <strong>{quantidade}</strong> contagem ciclicas
                </div>

                <DialogFooter className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Agora não
                    </Button>
                    <Button onClick={onIrParaContagem}>
                        Ir Para Contagem
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}