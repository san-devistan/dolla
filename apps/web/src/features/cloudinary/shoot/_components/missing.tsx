function MissingShoot({
  categoryName,
  shootName,
}: {
  categoryName: string
  shootName: string
}) {
  return (
    <section className="mx-auto flex min-h-[58svh] w-full max-w-[1540px] flex-col justify-center px-4 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        Shoot not found
      </p>
      <h1 className="mt-4 font-heading text-5xl tracking-[0.12em] uppercase">
        {categoryName} / {shootName}
      </h1>
    </section>
  )
}

export { MissingShoot }
