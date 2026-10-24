import Image from 'next/image';
import { iconStyle } from '../../lib/design-tokens.ts';

export function BrandMark() {
  return (
    <Image
      src="/brand/draftroom-mark.svg"
      width={iconStyle.sizes.brand}
      height={iconStyle.sizes.brand}
      alt=""
      aria-hidden="true"
      className="brandmark"
    />
  );
}

export function BrandLogo() {
  return (
    <div className="brand" role="img" aria-label="Draftroom">
      <Image
        src="/brand/draftroom-logo.svg"
        width={200}
        height={36}
        alt=""
        className="brand-name"
      />
      <BrandMark />
    </div>
  );
}
