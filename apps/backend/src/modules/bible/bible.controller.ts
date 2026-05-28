import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { BibleService }  from './bible.service'
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard'
import { Public }        from '../../common/decorators/public.decorator'

@ApiTags('bible')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bible')
export class BibleController {
  constructor(private readonly bibleService: BibleService) {}

  @Public()
  @Get('books')
  @ApiOperation({ summary: 'List all 66 Bible books' })
  getBooks() { return this.bibleService.getBooks() }

  @Public()
  @Get('verse-of-the-day')
  @ApiOperation({ summary: 'Get today\'s verse of the day' })
  @ApiQuery({ name: 'translation', required: false, example: 'NIV' })
  verseOfTheDay(@Query('translation') translation?: string) {
    return this.bibleService.getVerseOfTheDay(translation)
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Full-text search across Bible verses' })
  @ApiQuery({ name: 'q',           required: true })
  @ApiQuery({ name: 'translation', required: false, example: 'NIV' })
  @ApiQuery({ name: 'limit',       required: false, example: 20 })
  search(
    @Query('q')           q:            string,
    @Query('translation') translation?: string,
    @Query('limit')       limit?:       number,
  ) {
    return this.bibleService.search(q, translation, limit)
  }

  @Public()
  @Get('reference/:book/:chapter')
  @ApiOperation({ summary: 'Get a full chapter' })
  getChapter(
    @Param('book')    book:    string,
    @Param('chapter') chapter: number,
    @Query('translation') translation?: string,
  ) {
    return this.bibleService.getReference(book, chapter, undefined, translation)
  }

  @Public()
  @Get('reference/:book/:chapter/:verse')
  @ApiOperation({ summary: 'Get a specific verse' })
  getVerse(
    @Param('book')    book:    string,
    @Param('chapter') chapter: number,
    @Param('verse')   verse:   number,
    @Query('translation') translation?: string,
  ) {
    return this.bibleService.getReference(book, chapter, verse, translation)
  }
}
