//
//  NACard.m
//  airflick
//
//  Created by Nathan Teetor on 4/2/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import "NACard.h"

@implementation NACard

- (instancetype)initWithParentView:(UIView *)parentView {
    self = [super init];
    
    if (self){
        UIColor *magenta = [UIColor colorWithRed:255/255.0f green:0/255.0f blue:255/255.0f alpha:1.0f];
        UIColor *cyan = [UIColor colorWithRed:0/255.0f green:255/255.0f blue:255/255.0f alpha:1.0f];
        UIColor *yellow = [UIColor colorWithRed:255/255.0f green:255/255.0f blue:0/255.0f alpha:1.0f];
        
        UIColor *COLORS[] = { magenta, cyan, yellow };
        NSString *TYPES[] = { @"magenta", @"cyan", @"yellow" };
        NSUInteger i = arc4random_uniform(3);
        NSLog(@"i = %d",i);
        
        _color = COLORS[i];
        _typeColor = TYPES[i];
        
        _parentView = parentView;
    }
    
    return self;
}

- (void)display {
    NSInteger x = _parentView.bounds.size.width/4;
    NSInteger y = _parentView.bounds.size.height/4;
    CGRect frame = CGRectMake(x,y,x*2,y*2);
    
    // UIColor * color = [UIColor colorWithRed:255/255.0f green:0/255.0f blue:255/255.0f alpha:1.0f];
    
    UIView *cardView = [[UIView alloc] initWithFrame:frame];
    cardView.backgroundColor = _color;
    
    [_parentView.window addSubview:cardView];
}

@end
