import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: "Nombre total d'éléments" })
  totalItems: number;

  @ApiProperty({ description: 'Nombre total de pages' })
  totalPages: number;

  @ApiProperty({ description: 'Page courante' })
  currentPage: number;

  @ApiProperty({ description: "Nombre d'éléments par page" })
  itemsPerPage: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Liste des éléments pour la page courante' })
  items: T[];

  @ApiProperty({
    description: 'Métadonnées de pagination',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;

  constructor(items: T[], meta: PaginationMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
