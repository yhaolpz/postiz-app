import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class LinkedinDto {
  @IsString()
  @IsIn(['post', 'article'])
  @IsOptional()
  post_type?: 'post' | 'article';

  @IsBoolean()
  @IsOptional()
  post_as_images_carousel?: boolean;

  @IsString()
  @IsOptional()
  carousel_name?: string;

  @ValidateIf((o) => o.post_type === 'article')
  @IsDefined()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  article_url?: string;

  @ValidateIf((o) => o.post_type === 'article')
  @IsDefined()
  @IsString()
  @MaxLength(399)
  article_title?: string;

  @IsString()
  @MaxLength(4085)
  @IsOptional()
  article_description?: string;
}
