import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { Landmark, Plus, Edit, Trash2 } from "lucide-react";
import type { BankAccount } from "@/types/person";

interface BankAccountsTabProps {
  bankAccounts: BankAccount[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Mapa id → nombre para resolver el tipo de cuenta desde ref_types */
  refTypesMap?: Record<number, string>;
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return `${"•".repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}`;
}

export function BankAccountsTab({
  bankAccounts,
  onEdit,
  onDelete,
  refTypesMap = {},
}: BankAccountsTabProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-uta-blue" />
          <span>Cuentas Bancarias</span>
          <Badge variant="outline" className="ml-1">
            {bankAccounts.length}
          </Badge>
        </CardTitle>

        <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => onEdit("bankAccount", null)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva cuenta
        </Button>
      </CardHeader>

      <CardContent>
        {bankAccounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Landmark className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay cuentas bancarias registradas</p>
            <p className="text-sm">Agrega una cuenta haciendo clic en &quot;Nueva cuenta&quot;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map((account) => {
              const typeName = refTypesMap[Number(account.accountTypeId)] ?? null;

              return (
                <Card key={account.accountId} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm sm:text-base">
                            {account.financialInstitution}
                          </span>
                          {typeName && (
                            <Badge variant="secondary" className="text-xs">
                              {typeName}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <ActionIconButton
                          icon={Edit}
                          label="Editar cuenta bancaria"
                          tone="primary"
                          onClick={() => onEdit("bankAccount", account)}
                          touch
                        />
                        <ActionIconButton
                          icon={Trash2}
                          label="Eliminar cuenta bancaria"
                          tone="destructive"
                          onClick={() => onDelete(account.accountId)}
                          touch
                        />
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                      {maskAccountNumber(account.accountNumber)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
