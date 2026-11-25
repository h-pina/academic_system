import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * OpenAPI description of the REST API at `/api/docs` (RNF08), so other
 * institutional systems (financial, library) can integrate. Disabled with
 * `API_DOCS=false`.
 */
export function setupApiDocs(app: INestApplication): void {
  if (process.env.API_DOCS === 'false') return;
  const config = new DocumentBuilder()
    .setTitle('Sistema de Gestão Acadêmica')
    .setDescription(
      'API REST do sistema acadêmico. Autentique em POST /auth/login e envie o token em Authorization: Bearer.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
