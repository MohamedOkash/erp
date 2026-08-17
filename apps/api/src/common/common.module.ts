import { Global, Module } from '@nestjs/common';
import { ScopeService } from './services/scope.service';
import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [ScopeService],
  exports: [ScopeService],
})
export class CommonModule {}
