import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { Landmark, Plus, Edit, Trash2 } from "lucide-react";
import type { BankAccount } from "@/types/person";
import { useCvListState, buildFilterOptions, type CvSortOption, type CvFilterField } from "@/hooks/personDetails/useCvListState";
import { CvListToolbar } from "@/components/person-detail/CvListToolbar";
import { CvFilterBar } from "@/components/person-detail/CvFilterBar";
import { DataPagination } from "@/components/ui/DataPagination";

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
  const sortOptions: CvSortOption<BankAccount>[] = [
    {
      value: "institution_asc",
      label: "Institución (A-Z)",
      compare: (a, b) => (a.financialInstitution || "").localeCompare(b.financialInstitution || ""),
    },
    {
      value: "type_asc",
      label: "Tipo de cuenta",
      compare: (a, b) =>
        (refTypesMap[Number(a.accountTypeId)] || "").localeCompare(refTypesMap[Number(b.accountTypeId)] || ""),
    },
  ];

  const filterFields: CvFilterField<BankAccount>[] = [
    {
      key: "type",
      label: "Tipo de cuenta",
      options: buildFilterOptions(bankAccounts.map((a) => refTypesMap[Number(a.accountTypeId)] ?? null)),
      getValue: (a) => refTypesMap[Number(a.accountTypeId)] ?? null,
    },
  ];

  // Nota: la búsqueda NO incluye accountNumber a propósito — el número se muestra
  // enmascarado en pantalla y permitir buscarlo abriría un oráculo para confirmar
  // dígitos ocultos por prueba y error.
  const list = useCvListState({
    items: bankAccounts,
    searchText: (a) => `${a.financialInstitution ?? ""} ${refTypesMap[Number(a.accountTypeId)] ?? ""}`,
    sortOptions,
    defaultSort: "institution_asc",
    filterFields,
  });

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
          <>
            <CvListToolbar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Buscar por institución o tipo de cuenta..."
              sortValue={list.sortValue}
              onSortChange={list.setSortValue}
              sortOptions={sortOptions}
            />
            <CvFilterBar
              fields={list.filterFields}
              values={list.filterValues}
              onChange={list.setFilterValue}
              onClear={list.clearFilters}
            />

            {list.totalCount === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No se encontraron cuentas bancarias con ese criterio.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.paginatedItems.map((account) => {
              const typeName = refTypesMap[Number(account.accountTypeId)] ?? null;

              return (
                <Card key={account.accountId} className="hover:shadow-md transition-shadow border-l-4 border-l-pink-500">
                  <CardContent className="p-3 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="flex items-center justify-center h-8 w-8 rounded-md bg-pink-500/10 shrink-0">
                          <Landmark className="h-4 w-4 text-pink-500" />
                        </div>
                        <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            {account.financialInstitution}
                          </span>
                          {typeName && (
                            <Badge variant="secondary" className="text-xs">
                              {typeName}
                            </Badge>
                          )}
                        </div>
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

                    <p className="text-xs text-muted-foreground font-mono">
                      {maskAccountNumber(account.accountNumber)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
              </div>
            )}

            <DataPagination
              page={list.page}
              totalPages={list.totalPages}
              totalCount={list.totalCount}
              pageSize={list.pageSize}
              hasPreviousPage={list.hasPreviousPage}
              hasNextPage={list.hasNextPage}
              onPageChange={list.setPage}
              onPageSizeChange={list.setPageSize}
              pageSizeOptions={[6, 12, 24, 48]}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
