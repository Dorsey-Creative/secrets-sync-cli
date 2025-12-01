import { FLAG_HELP, VALID_FLAGS } from './flagHelp';

export async function printFlagHelp(flagName: string): Promise<void> {
  const help = FLAG_HELP[flagName];

  if (!help) {
    // Check if it's a valid flag without help content
    if (VALID_FLAGS.includes(flagName)) {
      console.log(`\nNo detailed help available for ${flagName} yet.`);
      console.log(`Run 'secrets-sync --help' to see all available options.\n`);
      return;
    }
    
    // Invalid flag - show error
    console.error(`\nError: Unknown flag '${flagName}'`);
    console.error(`Run 'secrets-sync --help' to see all available options.\n`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n🔐 Help: ${help.flag}${help.aliases ? `, ${help.aliases.join(', ')}` : ''}\n`);
  console.log(help.description);
  console.log('\nUsage:');
  help.usage.forEach(u => console.log(`  ${u}`));

  console.log('\nWhen to use:');
  help.whenToUse.forEach(w => console.log(`  ✓ ${w}`));

  if (help.whenNotToUse?.length) {
    console.log('\nWhen NOT to use:');
    help.whenNotToUse.forEach(w => console.log(`  ✗ ${w}`));
  }

  if (help.relatedFlags?.length) {
    console.log('\nRelated flags:');
    help.relatedFlags.forEach(f => console.log(`  ${f}`));
  }

  console.log(`\nDocumentation: ${help.docsUrl}\n`);
}
